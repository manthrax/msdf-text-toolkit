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
    import { MSDFTextRenderer, solidColor } from './lib/MSDFTextRenderer.js';

    // Setup scene
    const scene = new THREE.Scene();
    const textRenderer = new MSDFTextRenderer(scene);

    // Load font
    await textRenderer.loadFont(
      'myFont',
      'atlases/MyFont.png',
      'atlases/MyFont.json'
    );

    // Create text
    const { id, mesh } = textRenderer.createText({
      fontName: 'myFont',
      text: 'Hello World!',
      scale: 0.01,
      thickness: 0.5,
      colorFunction: solidColor(0x60a5fa)
    });

    // Update text later
    textRenderer.updateText(id, 'New Text!');
    textRenderer.updateParams(id, {
      outlineWidth: 0.1,
      outlineColor: 0x000000
    });
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
│   ├── MSDFTextRenderer.js  # Main API
│   ├── shaders.js           # GLSL shaders
│   └── utils.js             # Helper functions
├── examples/              # Usage examples
│   ├── basic.html         # Basic text rendering
│   └── matrix.html        # Matrix digital rain effect
├── atlases/               # Generated MSDF atlases
└── README.md
```

## API Reference

### MSDFTextRenderer

#### Constructor
```javascript
const renderer = new MSDFTextRenderer(scene);
```

#### loadFont(fontName, atlasImageUrl, atlasDataUrl)
Load an MSDF font atlas.

```javascript
await renderer.loadFont('myFont', 'path/to/atlas.png', 'path/to/atlas.json');
```

#### createText(options)
Create a new text mesh.

```javascript
const { id, mesh } = renderer.createText({
  fontName: 'myFont',        // Required: Name of loaded font
  text: 'Hello!',            // Required: Text content
  scale: 0.01,               // Optional: Scale factor (default: 0.01)
  thickness: 0.5,            // Optional: Text thickness 0-1 (default: 0.5)
  smoothness: 0.05,          // Optional: Edge smoothness (default: 0.05)
  outlineWidth: 0.0,         // Optional: Outline width (default: 0.0)
  outlineColor: 0x000000,    // Optional: Outline color (default: black)
  colorFunction: (i, total) => color  // Optional: Per-char coloring
});
```

#### updateText(id, newText)
Update the text content of an existing mesh.

```javascript
renderer.updateText(id, 'New text content!');
```

#### updateParams(id, params)
Update rendering parameters without recreating the mesh.

```javascript
renderer.updateParams(id, {
  thickness: 0.6,
  outlineWidth: 0.1,
  outlineColor: 0xff0000
});
```

#### removeText(id)
Remove a text mesh.

```javascript
renderer.removeText(id);
```

#### dispose()
Clean up all resources.

```javascript
renderer.dispose();
```

### Color Functions

#### solidColor(color)
Creates a solid color function.

```javascript
import { solidColor } from './lib/MSDFTextRenderer.js';
colorFunction: solidColor(0x60a5fa)
```

#### rainbowGradient(index, total)
Creates a rainbow gradient across characters.

```javascript
import { rainbowGradient } from './lib/MSDFTextRenderer.js';
colorFunction: rainbowGradient
```

#### alternatingColors(...colors)
Alternates between provided colors.

```javascript
import { alternatingColors } from './lib/MSDFTextRenderer.js';
colorFunction: alternatingColors(0xff0000, 0x00ff00, 0x0000ff)
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

