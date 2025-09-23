# SVG Shaper Editor

A client-side web application for editing Shaper Tools attributes in SVG files.

## Features

- **File Upload**: Drag and drop or browse to upload SVG files
- **Interactive SVG Display**: Click on paths to edit their attributes
- **Zoom & Pan**: Mouse wheel to zoom, drag to pan the SVG view
- **Gutter Grid**: Optional grid overlay for reference
- **Attribute Editing**: Edit Shaper namespace attributes with a clean dialog
- **Export**: Download modified SVG files
- **No Server Required**: Runs entirely in the browser

## Usage

1. Open `index.html` in a web browser
2. Upload an SVG file by dragging and dropping or clicking "Choose File"
3. Click on any path in the SVG to edit its Shaper attributes
4. Modify attributes in the dialog and click "Save Changes"
5. Export the modified SVG using the "Export SVG" button

## Supported Shaper Attributes

- `shaper:cutType` - Type of cut (online, offline, pocket)
- `shaper:cutDepth` - Depth of cut (e.g., "15mm")
- `shaper:cutOffset` - Cut offset (e.g., "0in")
- `shaper:toolDia` - Tool diameter (e.g., "6mm")
- Custom attributes can be added as needed

## Keyboard Shortcuts

- `Ctrl/Cmd + +` - Zoom in
- `Ctrl/Cmd + -` - Zoom out
- `Ctrl/Cmd + 0` - Zoom to fit
- `Ctrl/Cmd + S` - Export SVG
- `Escape` - Close modal dialog

## Sample File

A sample SVG file with Shaper attributes is included (`sample-shaper.svg`) for testing.

## Browser Compatibility

Works in all modern browsers that support ES6+ features:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Files

- `index.html` - Main application interface
- `styles.css` - Modern UI styling
- `script.js` - Application logic and functionality
- `sample-shaper.svg` - Sample SVG with Shaper attributes for testing