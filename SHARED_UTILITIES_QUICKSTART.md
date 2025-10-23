# Shared Utilities Quick Start

## TL;DR

Three new libraries eliminate code duplication:
- **`lib/threeHelpers.js`** - Three.js setup utilities
- **`lib/uiHelpers.js`** - UI interaction helpers  
- **`lib/demo-styles.css`** - Shared styles

## Minimal Example

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="../lib/demo-styles.css">
</head>
<body>
  <div class="msdf-controls">
    <h2>My Demo</h2>
    <div class="control-group">
      <label>Color</label>
      <input type="color" id="color" value="#ffffff">
    </div>
  </div>

  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
  }
  </script>

  <script type="module">
    import { MSDFString } from '../lib/MSDFString.js';
    import { initThreeScene, createAnimationLoop } from '../lib/threeHelpers.js';
    import { syncColorInputs } from '../lib/uiHelpers.js';

    // Initialize Three.js (replaces ~30 lines)
    const ctx = initThreeScene(document.body, {
      bgColor: 0x000000,
      cameraPosition: { x: 0, y: 0, z: 5 }
    });

    // Load font and create text
    await MSDFString.loadFont('MyFont', '/atlases');
    const textMesh = new MSDFString({
      font: 'MyFont',
      text: 'Hello World!',
      color: '#ffffff'
    });
    ctx.scene.add(textMesh);

    // Setup controls (replaces ~12 lines)
    syncColorInputs(
      document.getElementById('color'),
      null,
      (color) => textMesh.setGlobalColor(color)
    );

    // Start animation (replaces ~10 lines)
    createAnimationLoop(() => {
      // Your per-frame logic here
    }, ctx);
  </script>
</body>
</html>
```

## Common Patterns

### Three.js Setup
```javascript
const ctx = initThreeScene(container, options);
// Access: ctx.scene, ctx.camera, ctx.renderer, ctx.controls
```

### Animation Loop
```javascript
createAnimationLoop((ctx) => {
  // Your update logic
}, ctx);
```

### Color Picker + Text Input
```javascript
syncColorInputs(colorPicker, textInput, (color) => {
  // color changed
});
```

### Slider + Value Display
```javascript
syncSliderValue(slider, display, (value) => {
  // value changed
}, { decimals: 2 });
```

### Raycasting / Click Selection
```javascript
setupRaycasting(camera, canvas, (instanceId) => {
  // instance clicked
}, { objects: [mesh] });
```

### Color Conversion
```javascript
import { hexToRgb, rgbToHex } from '../lib/uiHelpers.js';

const rgb = hexToRgb('#ff6600'); // {r: 255, g: 102, b: 0}
const hex = rgbToHex(255, 102, 0); // '#ff6600'
```

## Full API

See `DRY_IMPROVEMENTS.md` for complete API documentation.

## Examples

Look at the refactored examples:
- `examples/basic.html` - Full-featured demo using all helpers
- `examples/matrix-mode.html` - Animation-focused demo

## Benefits

- **~160 lines saved** per typical demo
- **Automatic window resize** handling
- **Consistent behavior** across toolkit
- **Well-documented** with JSDoc
- **No linter errors**

## Migration

To migrate existing code:
1. Replace Three.js setup with `initThreeScene()`
2. Replace animation loop with `createAnimationLoop()`
3. Replace control setup with helper functions
4. Link to `demo-styles.css`

That's it! 🎉

