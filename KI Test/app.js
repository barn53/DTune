const dropZone = document.getElementById('drop-zone');
const infoBox = document.getElementById('info-box');

// --- KONSTANTEN ---
const DPI = 96;
const MM_PER_INCH = 25.4;
const GUTTER_MM = 10;
const GUTTER_PX = GUTTER_MM / MM_PER_INCH * DPI;


// =================================================================================
// HAUPT-EVENT-LISTENER
// =================================================================================

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = (event) => {
            processSVG(event.target.result);
        };
        reader.readAsText(file);
    } else {
        infoBox.textContent = '';
        alert('Bitte nur SVG-Dateien ablegen.');
    }
});


// =================================================================================
// SVG-VERARBEITUNGS-PIPELINE
// =================================================================================

function processSVG(originalSvgContent) {
    const svgContentWithIds = addIdsToSvgElements(originalSvgContent);
    const elementGeometries = getElementGeometries(svgContentWithIds);
    const totalSize = getTotalSize(svgContentWithIds);
    const visualizedSvgContent = addVisualizations(svgContentWithIds, totalSize);
    const tableHtml = createTable(elementGeometries, totalSize);

    console.log("--- Modifiziertes SVG mit Visualisierungen ---");
    console.log(visualizedSvgContent);

    dropZone.innerHTML = visualizedSvgContent;
    infoBox.innerHTML = tableHtml;
}


// =================================================================================
// TEILFUNKTIONEN
// =================================================================================

function addIdsToSvgElements(svgContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");
    const relevantElements = doc.querySelectorAll('path, rect, circle, ellipse, line, polygon, polyline');
    relevantElements.forEach(el => {
        if (!el.id) {
            el.id = 'app-id-' + Math.random().toString(36).slice(2, 11);
        }
    });
    return new XMLSerializer().serializeToString(doc.documentElement);
}

function getElementGeometries(svgContent) {
    const geometries = [];
    const tempContainer = document.createElement('div');
    tempContainer.style.all = 'initial';
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.innerHTML = svgContent;
    document.body.appendChild(tempContainer);

    const svgToMeasure = tempContainer.querySelector('svg');
    if (!svgToMeasure) {
        document.body.removeChild(tempContainer);
        return [];
    }

    const viewBoxAttr = svgToMeasure.getAttribute('viewBox');
    if (viewBoxAttr) {
        const [, , width, height] = viewBoxAttr.split(/[ ,]+/);
        svgToMeasure.style.width = `${width}px`;
        svgToMeasure.style.height = `${height}px`;
    }

    const svgBbox = svgToMeasure.getBoundingClientRect();

    svgToMeasure.querySelectorAll('[id^="app-id-"]').forEach(el => {
        const tagName = el.tagName.toLowerCase();
        if (tagName === 'g' || typeof el.getBoundingClientRect !== 'function') {
            return;
        }

        const bbox = el.getBoundingClientRect();
        if (bbox.width > 0 || bbox.height > 0) {
            geometries.push({
                id: el.id,
                tagName: tagName,
                x: bbox.x - svgBbox.x,
                y: bbox.y - svgBbox.y,
                width: bbox.width,
                height: bbox.height,
            });
        }
    });

    document.body.removeChild(tempContainer);
    return geometries;
}

function getTotalSize(svgContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");
    const svgElement = doc.querySelector('svg');
    if (!svgElement) return null;

    const viewBoxAttr = svgElement.getAttribute('viewBox');
    if (viewBoxAttr) {
        const parts = viewBoxAttr.split(/[ ,]+/);
        if (parts.length === 4) {
            return {
                x: parseFloat(parts[0]),
                y: parseFloat(parts[1]),
                width: parseFloat(parts[2]),
                height: parseFloat(parts[3]),
            };
        }
    }
    return null;
}

function replicateParentTransforms(originalElement, doc) {
    const NS = "http://www.w3.org/2000/svg";
    const geometryAttrs = ['d', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points'];
    const cleanGeometricClone = doc.createElementNS(NS, originalElement.tagName);
    for (const attr of geometryAttrs) {
        if (originalElement.hasAttribute(attr)) {
            cleanGeometricClone.setAttribute(attr, originalElement.getAttribute(attr));
        }
    }
    if (originalElement.id) {
        cleanGeometricClone.setAttribute('id', `from-id-${originalElement.id}`);
    }

    // *** NEUE, DIREKTE ZUWEISUNG DES EFFEKTS ***
    cleanGeometricClone.setAttribute("vector-effect", "non-scaling-stroke");

    let currentElement = originalElement;
    let topLevelClone = cleanGeometricClone;

    while (currentElement && currentElement.parentElement && currentElement.parentElement.tagName.toLowerCase() === 'g') {
        const parentG = currentElement.parentElement;
        const cleanGClone = doc.createElementNS(NS, 'g');
        if (parentG.hasAttribute('transform')) {
            cleanGClone.setAttribute('transform', parentG.getAttribute('transform'));
        }
        cleanGClone.appendChild(topLevelClone);
        topLevelClone = cleanGClone;
        currentElement = parentG;
    }

    return topLevelClone;
}


function addVisualizations(svgContent, totalSize) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");
    const svgElement = doc.querySelector('svg');

    const outlineGroup = doc.createElementNS("http://www.w3.org/2000/svg", "g");
    outlineGroup.setAttribute("fill", "none");
    outlineGroup.setAttribute("stroke", "#36f");
    const strokeWidthPx = (1 / MM_PER_INCH * DPI) * 2;
    outlineGroup.setAttribute("stroke-width", `${strokeWidthPx}`);
    outlineGroup.setAttribute("stroke-linejoin", "round");
    outlineGroup.setAttribute("stroke-linecap", "round");

    const elementsToOutline = svgElement.querySelectorAll('[id^="app-id-"]');
    elementsToOutline.forEach(originalElement => {
        const transformedClone = replicateParentTransforms(originalElement, doc);
        outlineGroup.appendChild(transformedClone);
    });

    svgElement.prepend(outlineGroup);

    if (totalSize) {
        const gutterGroup = doc.createElementNS("http://www.w3.org/2000/svg", "g");
        gutterGroup.setAttribute("stroke", "lightgrey");
        gutterGroup.setAttribute("stroke-width", "1px");
        gutterGroup.setAttribute("stroke-dasharray", "2 6");
        gutterGroup.setAttribute("vector-effect", "non-scaling-stroke");

        for (let y = totalSize.y + GUTTER_PX; y < totalSize.y + totalSize.height; y += GUTTER_PX) {
            const line = doc.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", totalSize.x);
            line.setAttribute("y1", y);
            line.setAttribute("x2", totalSize.x + totalSize.width);
            line.setAttribute("y2", y);
            gutterGroup.appendChild(line);
        }
        for (let x = totalSize.x + GUTTER_PX; x < totalSize.x + totalSize.width; x += GUTTER_PX) {
            const line = doc.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", x);
            line.setAttribute("y1", totalSize.y);
            line.setAttribute("x2", x);
            line.setAttribute("y2", totalSize.y + totalSize.height);
            gutterGroup.appendChild(line);
        }
        svgElement.prepend(gutterGroup);
    }

    if (totalSize) {
        const mainBboxRect = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
        mainBboxRect.setAttribute("x", totalSize.x);
        mainBboxRect.setAttribute("y", totalSize.y);
        mainBboxRect.setAttribute("width", totalSize.width);
        mainBboxRect.setAttribute("height", totalSize.height);
        mainBboxRect.setAttribute("fill", "none");
        mainBboxRect.setAttribute("stroke", "red");
        mainBboxRect.setAttribute("stroke-width", "1px");
        mainBboxRect.setAttribute("vector-effect", "non-scaling-stroke");
        svgElement.appendChild(mainBboxRect);
    }

    return new XMLSerializer().serializeToString(doc.documentElement);
}

function createTable(geometries, totalSize) {
    let tableHtml = '';
    if (totalSize) {
        const widthMm = totalSize.width / DPI * MM_PER_INCH;
        const heightMm = totalSize.height / DPI * MM_PER_INCH;
        tableHtml += `<b>Gesamtgröße:</b> ${totalSize.width.toFixed(2)}px x ${totalSize.height.toFixed(2)}px | ${widthMm.toFixed(2)}mm x ${heightMm.toFixed(2)}mm<hr>`;
    }

    tableHtml += `<br><b>Elemente:</b><br>
        <table border="1" style="border-collapse: collapse; margin-top: 10px; font-size: 12px; text-align: right;">
            <thead>
                <tr>
                    <th style="text-align: left;">Element</th>
                    <th style="text-align: left;">ID</th>
                    <th>X (px)</th>
                    <th>X (mm)</th>
                    <th>Y (px)</th>
                    <th>Y (mm)</th>
                    <th>Breite (px)</th>
                    <th>Breite (mm)</th>
                    <th>Höhe (px)</th>
                    <th>Höhe (mm)</th>
                </tr>
            </thead>
            <tbody>`;

    geometries.forEach(geom => {
        tableHtml += `<tr>
            <td style="text-align: left;">${geom.tagName}</td>
            <td style="text-align: left;">${geom.id}</td>
            <td>${geom.x.toFixed(2)}</td>
            <td>${(geom.x / DPI * MM_PER_INCH).toFixed(2)}</td>
            <td>${geom.y.toFixed(2)}</td>
            <td>${(geom.y / DPI * MM_PER_INCH).toFixed(2)}</td>
            <td>${geom.width.toFixed(2)}</td>
            <td>${(geom.width / DPI * MM_PER_INCH).toFixed(2)}</td>
            <td>${geom.height.toFixed(2)}</td>
            <td>${(geom.height / DPI * MM_PER_INCH).toFixed(2)}</td>
        </tr>`;
    });

    tableHtml += '</tbody></table>';
    return tableHtml;
}