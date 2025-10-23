# DRY (Don't Repeat Yourself) Improvements

This document outlines the refactoring done to eliminate code duplication across the MSDF Text Toolkit.

## Summary

The following shared libraries were created to eliminate code duplication:

1. **`lib/threeHelpers.js`** - Three.js scene initialization and utilities
2. **`lib/uiHelpers.js`** - UI interaction patterns and utilities
3. **`lib/demo-styles.css`** - Shared CSS styles for demos and generator

## Files Refactored

### Examples
- ✅ `examples/basic.html` - Fully refactored to use shared utilities
- ✅ `examples/matrix-mode.html` - Fully refactored to use shared utilities

### Generator
- ⚠️ `generator/ui/index.html` - Partially refactored (imports added, can use helpers)

---

## New Shared Libraries

### 1. `lib/threeHelpers.js`

**Purpose**: Eliminate repetitive Three.js scene setup code.

**Functions**:

#### `initThreeScene(container, options)`
Initialize a complete Three.js scene with camera, renderer, and controls.

```javascript
import { initThreeScene } from '../lib/threeHelpers.js';

const threeContext = initThreeScene(document.body, {
  bgColor: 0x0b0b0b,
  cameraPosition: { x: 0, y: 0, z: 5 },
  enableControls: true,
  controlsDamping: true
});

// Access: threeContext.scene, .camera, .renderer, .controls
```

**Options**:
- `bgColor` - Background color (default: `0x0b0b0b`)
- `cameraFov` - Field of view (default: `75`)
- `cameraNear` - Near clipping plane (default: `0.1`)
- `cameraFar` - Far clipping plane (default: `1000`)
- `cameraPosition` - Camera position `{x, y, z}` (default: `{x:0, y:0, z:5}`)
- `enableControls` - Enable OrbitControls (default: `true`)
- `controlsDamping` - Enable damping (default: `true`)
- `dampingFactor` - Damping factor (default: `0.05`)

**Benefits**:
- Automatically handles window resize
- Provides a `dispose()` method for cleanup
- Reduces ~30 lines of boilerplate per file

#### `createAnimationLoop(callback, context)`
Create a standard animation loop with controls update and rendering.

```javascript
import { createAnimationLoop } from '../lib/threeHelpers.js';

createAnimationLoop(() => {
  // Your per-frame update logic
  updateMatrix();
}, threeContext);
```

**Benefits**:
- Eliminates repetitive `requestAnimationFrame` loops
- Automatically calls `controls.update()` and `renderer.render()`
- Returns a stop function for cleanup

#### `setupRaycasting(camera, canvas, onIntersect, options)`
Setup raycasting for instanced meshes with click detection.

```javascript
import { setupRaycasting } from '../lib/threeHelpers.js';

setupRaycasting(
  camera,
  renderer.domElement,
  (instanceId) => selectCharacter(instanceId),
  { objects: [textMesh], dragThreshold: 200 }
);
```

**Benefits**:
- Handles mouse click vs drag detection
- Automatically normalizes mouse coordinates
- Returns a `dispose()` method for cleanup

---

### 2. `lib/uiHelpers.js`

**Purpose**: Eliminate repetitive UI interaction patterns.

**Functions**:

#### `syncColorInputs(colorPicker, textInput, onChange)`
Sync a color picker with a text input.

```javascript
import { syncColorInputs } from '../lib/uiHelpers.js';

syncColorInputs(
  document.getElementById('colorPicker'),
  document.getElementById('colorHex'),
  (color) => { textMesh.setGlobalColor(color); }
);
```

**Before** (12 lines):
```javascript
colorPicker.addEventListener('input', (e) => {
  colorHex.value = e.target.value;
  if (textMesh) textMesh.setGlobalColor(e.target.value);
});
colorHex.addEventListener('input', (e) => {
  colorPicker.value = e.target.value;
  if (textMesh) textMesh.setGlobalColor(e.target.value);
});
```

**After** (5 lines):
```javascript
syncColorInputs(
  colorPicker, colorHex,
  (color) => { if (textMesh) textMesh.setGlobalColor(color); }
);
```

#### `syncSliderValue(slider, valueDisplay, onChange, options)`
Sync a range slider with a value display element.

```javascript
import { syncSliderValue } from '../lib/uiHelpers.js';

syncSliderValue(
  document.getElementById('thickness'),
  document.getElementById('thicknessValue'),
  (val) => { textMesh.setGlobalThickness(val); },
  { decimals: 2 }
);
```

**Options**:
- `decimals` - Number of decimal places (default: `2`)
- `prefix` - Prefix for display (default: `''`)
- `suffix` - Suffix for display (default: `''`)

**Benefits**:
- Reduces slider setup from ~8 lines to ~5 lines
- Provides `setValue()` and `getValue()` methods
- Automatically initializes display

#### `hexToRgb(hex)` / `rgbToHex(r, g, b)`
Convert between hex and RGB color formats.

```javascript
import { hexToRgb, rgbToHex } from '../lib/uiHelpers.js';

const rgb = hexToRgb('#ff6600'); // {r: 255, g: 102, b: 0}
const hex = rgbToHex(255, 102, 0); // '#ff6600'
```

**Benefits**:
- Eliminates ad-hoc color conversion code
- Consistent format across all demos

#### `createNotifier(container, timeout)`
Create a simple status/notification system.

```javascript
import { createNotifier } from '../lib/uiHelpers.js';

const notifier = createNotifier(statusElement, 3000);
notifier.show('Atlas generated!', 'success');
notifier.show('Error loading font', 'error');
notifier.hide();
```

#### `createLogger(container, maxMessages)`
Create a simple logger with auto-scroll.

```javascript
import { createLogger } from '../lib/uiHelpers.js';

const logger = createLogger(logElement, 100);
logger.log('Font loaded', 'info');
logger.log('Generation failed', 'error');
logger.clear();
```

#### `setupFileUpload(fileInput, dropZone, onFileSelect)`
Setup file upload with drag-and-drop support.

```javascript
import { setupFileUpload } from '../lib/uiHelpers.js';

setupFileUpload(
  fileInput,
  dropZone,
  (file) => { console.log('File selected:', file.name); }
);
```

#### `debounce(func, wait)`
Debounce a function.

```javascript
import { debounce } from '../lib/uiHelpers.js';

const debouncedUpdate = debounce(() => {
  updatePreview();
}, 300);
```

---

### 3. `lib/demo-styles.css`

**Purpose**: Eliminate repetitive CSS styles.

**What's Included**:
- Body and canvas base styles
- `.msdf-controls` - Control panel container
- Form element styles (inputs, buttons, sliders, textareas)
- `.control-group` - Grouped form controls
- `.section` - Visual sections
- `.value-display` - Numeric value displays
- `.color-row` - Color picker rows
- `.hidden` - Hide elements

**Usage**:
```html
<link rel="stylesheet" href="../lib/demo-styles.css">

<div class="msdf-controls">
  <h2>🎨 Controls</h2>
  <div class="section">
    <div class="control-group">
      <label>Color</label>
      <input type="color" id="color">
    </div>
  </div>
</div>
```

**Benefits**:
- Eliminated ~120 lines of duplicate CSS per file
- Consistent look and feel across all demos
- Easy to customize globally

---

## Code Reduction Statistics

### `examples/basic.html`
- **Before**: ~430 lines
- **After**: ~270 lines
- **Reduction**: ~160 lines (37%)
- **Key improvements**:
  - Three.js setup: 30 lines → 5 lines
  - Animation loop: 10 lines → 3 lines
  - Resize handler: 8 lines → 0 lines (automatic)
  - Raycasting setup: 25 lines → 6 lines
  - Color picker sync: 24 lines → 10 lines
  - Slider sync: 16 lines → 8 lines
  - CSS: 120 lines → 1 line (link)

### `examples/matrix-mode.html`
- **Before**: ~300 lines
- **After**: ~276 lines
- **Reduction**: ~24 lines (8%)
- **Key improvements**:
  - Three.js setup: 30 lines → 5 lines
  - Animation loop: 10 lines → 3 lines
  - Resize handler: 8 lines → 0 lines (automatic)
  - CSS: Simplified with shared base

---

## Migration Guide

### For New Demos

1. **Link the CSS**:
```html
<link rel="stylesheet" href="../lib/demo-styles.css">
```

2. **Import helpers**:
```javascript
import { initThreeScene, createAnimationLoop } from '../lib/threeHelpers.js';
import { syncColorInputs, syncSliderValue } from '../lib/uiHelpers.js';
```

3. **Initialize scene**:
```javascript
const threeContext = initThreeScene(document.body, {
  bgColor: 0x0b0b0b,
  cameraPosition: { x: 0, y: 0, z: 5 }
});
```

4. **Start animation**:
```javascript
createAnimationLoop(() => {
  // Your update logic
}, threeContext);
```

### For Existing Demos

1. Replace manual Three.js setup with `initThreeScene()`
2. Replace animation loop with `createAnimationLoop()`
3. Replace color/slider sync code with helper functions
4. Replace custom CSS with shared styles + overrides

---

## Additional Opportunities

### Not Yet Implemented

These patterns appear multiple times but haven't been extracted yet:

1. **Matrix animation logic** - The matrix rain effect could be extracted into a reusable module
2. **Preset system** - Common preset patterns in generator
3. **API client** - Font loading and atlas generation API calls
4. **Download helpers** - File download/blob creation patterns

### Future Considerations

- Create a `MSDFDemo` base class that encapsulates common demo setup
- Extract matrix animation into `lib/effects/matrixRain.js`
- Create `lib/api.js` for centralized API interactions
- Add TypeScript definitions for better IDE support

---

## Testing Checklist

✅ All examples load without errors
✅ Three.js scenes render correctly
✅ OrbitControls work in all demos
✅ Color pickers sync with text inputs
✅ Sliders update values and trigger callbacks
✅ Raycasting selects characters in basic demo
✅ Matrix animation runs smoothly
✅ Window resize works correctly
✅ Shared styles apply consistently

---

## Benefits Summary

1. **Maintainability**: Fix bugs in one place, all demos benefit
2. **Consistency**: Uniform behavior and appearance
3. **Productivity**: New demos take less time to create
4. **Code Quality**: Cleaner, more readable code
5. **Performance**: Shared resources, less duplication
6. **Onboarding**: Easier for new developers to understand

---

## Questions?

For questions or suggestions about these shared utilities, please refer to:
- `lib/threeHelpers.js` - JSDoc comments
- `lib/uiHelpers.js` - JSDoc comments
- This document

Happy coding! 🎨

