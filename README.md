# MSDF Text Toolkit

A complete toolkit for generating and rendering high-quality, resolution-independent text in Three.js using Multi-channel Signed Distance Fields (MSDF).

## Features

✨ **High-Quality Text Rendering**
- Resolution-independent text that looks sharp at any scale
- Advanced antialiasing using fractional derivatives
- Per-instance coloring for dynamic effects
- Outline and stroke support

🎨 **Easy-to-Use Library**
- Clean ES6 module API
- Simple font loading and text creation
- Dynamic text updates without regeneration
- Efficient instanced rendering

🛠️ **Complete Generation Pipeline**
- Web-based MSDF atlas generator
- Node.js backend for native generation
- Support for TTF, OTF, WOFF fonts
- Configurable atlas parameters

## Quick Start

### 1. Generate an MSDF Atlas

First, start the generator server:

```bash
cd generator/server
npm install
npm start
```

Then open http://localhost:3001 in your browser to generate atlases from your fonts.

### 2. Use the Library

```html
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
      }
    }
  </script>
</head>
<body>
  <script type="module">
    import * as THREE from 'three';
    import { MSDFString } from './lib/MSDFString.js';

    // Setup scene
    const scene = new THREE.Scene();

    // Load font (cached for reuse)
    await MSDFString.loadFont('MyFont', '/atlases');

    // Create text
    const textMesh = new MSDFString({
      font: 'MyFont',
      text: 'Hello World!',
      fontSize: 0.01,
      color: '#60a5fa',
      thickness: 0.5
    });

    scene.add(textMesh);

    // Update text later
    textMesh.setText('New Text!');
    
    // Update appearance
    textMesh.setGlobalOutlineThickness(0.1);
    textMesh.setGlobalOutlineColor('#000000');
  </script>
</body>
</html>
```

## Project Structure

```
msdf-text-toolkit/
├── generator/              # MSDF atlas generation tools
│   ├── server/            # Node.js backend
│   │   ├── msdf-server.js
│   │   ├── msdfAtlasAPI.js
│   │   └── package.json
│   ├── ui/                # Web-based UI
│   │   └── index.html
│   └── fonts/             # Font files for generation
├── lib/                   # Reusable rendering library
│   ├── MSDFString.js        # Main text rendering class
│   ├── shaders.js           # GLSL shaders
│   ├── threeHelpers.js      # Three.js utilities
│   ├── uiHelpers.js         # UI interaction helpers
│   ├── textPreview.js       # Text preview utilities
│   ├── demo-styles.css      # Shared styles
│   └── effects/
│       └── matrixRain.js    # Matrix rain effect
├── examples/              # Usage examples
│   ├── basic.html         # Basic text rendering with interactive controls
│   └── matrix-mode.html   # Matrix digital rain effect
├── atlases/               # Generated MSDF atlases
└── README.md
```

## API Reference

### MSDFString

Main class for rendering MSDF text with Three.js.

#### Static Methods

##### `MSDFString.loadFont(fontName, basePath)`
Load and cache a font atlas.

```javascript
await MSDFString.loadFont('MyFont', '/atlases');
// Font is now cached and ready to use
```

##### `MSDFString.getFont(fontName)`
Get a cached font (returns null if not loaded).

```javascript
const fontData = MSDFString.getFont('MyFont');
```

#### Constructor
```javascript
const textMesh = new MSDFString({
  font: 'MyFont',              // Font name (must be loaded first)
  text: 'Hello World!',        // Text to display
  fontSize: 0.01,              // Font size (default: 1.0)
  align: 'left',               // 'left', 'center', or 'right'
  color: '#ffffff',            // Text color
  outlineColor: '#000000',     // Outline/glow color
  thickness: 0.5,              // Text thickness 0-1
  outlineThickness: 0.0,       // Outline/glow thickness
  maxLength: 100               // Initial capacity (grows dynamically)
});
```

#### Instance Methods

##### `setText(text, options)`
Update the text content.

```javascript
textMesh.setText('New Text!');
// or with options:
textMesh.setText('New Text!', { fontSize: 0.015, align: 'center' });
```

##### Global Controls (affect all characters)
```javascript
textMesh.setGlobalColor('#ff0000');
textMesh.setGlobalOutlineColor('#00ff00');
textMesh.setGlobalThickness(0.6);
textMesh.setGlobalOutlineThickness(0.1);
```

##### Glow Mode
```javascript
textMesh.enableGlow();   // Soft alpha fade
textMesh.disableGlow();  // Hard outline
textMesh.setGlobalGlowMode(0.5); // 0.0 = hard, 1.0 = glow
```

##### Per-Character Controls
```javascript
textMesh.setCharacterColor(index, '#ff0000', 1.0);
textMesh.setCharacterOutlineColor(index, '#00ff00', 1.0);
textMesh.setCharacterThickness(index, 0.8, 0.1);
textMesh.setCharacterGlowMode(index, true); // or false
```

##### Utility Methods
```javascript
textMesh.getText();              // Get current text
textMesh.getLength();            // Get character count
textMesh.resetCharacterAttributes(); // Reset all per-char styling
```

### Helper Modules

#### `textPreview.js`
```javascript
import { applyRainbowGradient, applyGradient } from './lib/textPreview.js';

applyRainbowGradient(textMesh);
applyGradient(textMesh, '#ff0000', '#0000ff');
```

#### `effects/matrixRain.js`
```javascript
import { MatrixRain } from './lib/effects/matrixRain.js';

const effect = new MatrixRain(textMesh, {
  columns: 300,
  charsPerColumn: 45
});

// In animation loop:
effect.update();
```

## Generator Usage

### Web Interface

1. Start the server: `cd generator/server && npm start`
2. Open http://localhost:3001
3. Select or upload a font
4. Configure atlas settings:
   - Field Type (MSDF, SDF, PSDF)
   - Font Size
   - Atlas dimensions
   - Distance range
5. Click "Generate Atlas"
6. Download generated PNG and JSON files

### Programmatic Generation (Node.js)

```javascript
import { generateAtlas } from './generator/server/msdfAtlasAPI.js';

const result = await generateAtlas({
  fontPath: 'path/to/font.ttf',
  outputName: 'MyFont',
  fontSize: 42,
  textureWidth: 1024,
  textureHeight: 1024,
  distanceRange: 4,
  fieldType: 'msdf'
});

// result.texture contains PNG buffer
// result.atlas contains JSON data
```

## Examples

See the `examples/` directory for complete working examples:

- **basic.html** - Simple text rendering with color and outlines
- **matrix.html** - Matrix-style digital rain effect

## Requirements

- **Generator**: Node.js 16+, `msdf-bmfont-xml`
- **Library**: Modern browser with ES6 module support, Three.js r160+

## Dependencies

### Generator Server
- `express` - Web server
- `cors` - CORS support
- `multer` - File uploads
- `msdf-bmfont-xml` - Native MSDF generation

### Library
- `three` (peer dependency) - Three.js r160 or higher

## Technical Details

### MSDF Benefits
- **Resolution Independence**: Text looks sharp at any scale
- **Small File Size**: One atlas for all sizes
- **GPU Efficient**: Rendered entirely in shaders
- **High Quality**: Advanced antialiasing with fractional derivatives

### Rendering Features
- Instanced rendering for thousands of characters
- Per-instance coloring
- Configurable outlines and strokes
- Smooth antialiasing at any zoom level
- Baseline-aligned text layout
- Multi-line support

## License

MIT

## Credits

- MSDF technique by Viktor Chlumský
- `msdf-bmfont-xml` by Soimy
- Three.js by mrdoob and contributors


