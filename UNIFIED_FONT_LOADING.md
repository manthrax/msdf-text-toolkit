# Unified Font Loading Architecture

## Overview

All font loading in the MSDF Text Toolkit goes through **`MSDFString`'s static font loading API**. This provides a single, consistent, cached approach to loading MSDF font atlases across all demos, examples, and the generator.

## Architecture

### Central Font Cache

```javascript
// In MSDFString class
static fontCache = new Map(); // fontName -> { texture, data }
```

All loaded fonts are cached in memory, preventing duplicate network requests and texture allocations.

### Loading Flow

```
User Code
    ↓
MSDFString.loadFont(name, basePath)
    ↓
Check fontCache
    ↓ (if not cached)
Load PNG + JSON in parallel
    ↓
Configure texture (colorSpace, filtering, mipmaps)
    ↓
Store in fontCache
    ↓
Return { texture, data }
```

## API Reference

### Static Methods

#### `MSDFString.loadFont(fontName, basePath)`
Load and cache a font atlas.

```javascript
await MSDFString.loadFont('Montserrat-Bold', '/atlases');
// Returns: { texture: THREE.Texture, data: Object }
// Cached for future use
```

**Parameters**:
- `fontName` (string) - Font name without extension (e.g., 'Montserrat-Bold')
- `basePath` (string) - Base path to atlas directory (default: '/atlases')

**Returns**: `Promise<{texture, data}>`

**Behavior**:
- Checks cache first (instant return if cached)
- Loads `${basePath}/${fontName}.png` and `.json` in parallel
- Configures texture with proper MSDF settings:
  - `colorSpace`: `NoColorSpace`
  - `minFilter`: `LinearMipMapLinearFilter`
  - `magFilter`: `LinearFilter`
  - `flipY`: `false`
  - `generateMipmaps`: `true`
- Caches result
- Returns font data

#### `MSDFString.getFont(fontName)`
Get a cached font (synchronous).

```javascript
const fontData = MSDFString.getFont('Montserrat-Bold');
if (fontData) {
  // Use fontData.texture, fontData.data
}
```

**Returns**: `{texture, data} | null`

#### `MSDFString.clearFontCache()`
Clear all cached fonts and dispose textures.

```javascript
MSDFString.clearFontCache();
// Disposes all textures and clears cache
```

## Usage Patterns

### Pattern 1: Load and Create (Recommended)

```javascript
// Load font first
await MSDFString.loadFont('MyFont', '/atlases');

// Create text mesh using font name
const textMesh = new MSDFString({
  font: 'MyFont',
  text: 'Hello World!'
});
```

**Benefits**:
- Clean separation of loading and creation
- Font can be reused for multiple meshes
- Explicit loading step makes async flow clear

### Pattern 2: Direct Font Object (Advanced)

```javascript
// Load font and get data
const fontData = await MSDFString.loadFont('MyFont', '/atlases');

// Create text mesh with font object
const textMesh = new MSDFString({
  font: fontData, // Pass entire font object
  text: 'Hello World!'
});
```

**Use cases**:
- When you need access to font metadata
- When working with dynamically generated atlases
- Generator UI after atlas creation

### Pattern 3: Pre-cached Fonts

```javascript
// Load multiple fonts upfront
await Promise.all([
  MSDFString.loadFont('Font1', '/atlases'),
  MSDFString.loadFont('Font2', '/atlases'),
  MSDFString.loadFont('Font3', '/atlases')
]);

// Later, create text meshes instantly
const mesh1 = new MSDFString({ font: 'Font1', text: 'Text 1' });
const mesh2 = new MSDFString({ font: 'Font2', text: 'Text 2' });
const mesh3 = new MSDFString({ font: 'Font3', text: 'Text 3' });
```

**Benefits**:
- Fast text mesh creation
- Preload screen can show progress
- Fonts ready when needed

## Integration Points

### Examples (basic.html, matrix-mode.html)

```javascript
// Load font at startup
await MSDFString.loadFont('Montserrat-Bold', `${API_URL}/atlases`);

// Create text
const textMesh = new MSDFString({
  font: 'Montserrat-Bold',
  text: 'Demo Text'
});
```

### Generator UI

**Startup - Load Default Font:**
```javascript
// On page load, load and display Zenzai Itacha
async function loadExistingAtlas(fontName) {
  await MSDFString.loadFont(fontName, '/atlases');
  
  // Create demo text mesh
  const previewMesh = new MSDFString({
    font: fontName,
    text: 'MSDF Text\nAtlas Loaded!',
    fontSize: 0.015,
    align: 'center'
  });
  
  scene.add(previewMesh);
}

loadExistingAtlas('Zenzai Itacha');
```

**After Generation:**
```javascript
function generateTextMesh(text, atlasData, atlasTexture) {
  // Use font object format for newly generated atlas
  const textMesh = new MSDFString({
    font: { texture: atlasTexture, data: atlasData },
    text: text
  });
  return textMesh;
}
```

## Why This Architecture?

### ✅ Unified API
- **Single source of truth** for font loading
- **Consistent behavior** across toolkit
- **Easier to maintain** and debug

### ✅ Performance
- **Automatic caching** prevents redundant loads
- **Parallel loading** of PNG + JSON
- **Texture reuse** across multiple text meshes

### ✅ Developer Experience
- **Simple API**: Just `loadFont()` and go
- **Async/await friendly**
- **Clear error messages**

### ✅ Flexibility
- **Named fonts**: Easy to reference by name
- **Font objects**: Direct access when needed
- **Multiple base paths**: Support different asset locations

## Migration Guide

### Old Approach (Removed)
```javascript
// ❌ Old way - manual texture loading
import { loadMSDFTexture } from '../lib/threeHelpers.js';

const texture = await loadMSDFTexture('/atlases/MyFont.png');
const response = await fetch('/atlases/MyFont.json');
const data = await response.json();

const textMesh = new MSDFString({
  font: { texture, data },
  text: 'Hello'
});
```

### New Approach (Current)
```javascript
// ✅ New way - unified loading
import { MSDFString } from '../lib/MSDFString.js';

await MSDFString.loadFont('MyFont', '/atlases');

const textMesh = new MSDFString({
  font: 'MyFont',
  text: 'Hello'
});
```

## Cache Management

### When to Clear Cache

- **Memory constraints**: Free up texture memory
- **Hot reloading**: Reload fonts during development
- **Dynamic atlases**: Replace cached fonts with new versions

```javascript
// Clear specific font (not currently supported, but could be added)
// MSDFString.clearFont('MyFont');

// Clear all fonts
MSDFString.clearFontCache();
```

### Cache Size

For typical use:
- **Font data**: ~10-50KB per font
- **Texture**: 256KB to 4MB per font (depending on atlas size)
- **10 fonts**: ~5-40MB total

Modern browsers handle this easily, but consider clearing cache if loading many large atlases.

## Error Handling

```javascript
try {
  await MSDFString.loadFont('MyFont', '/atlases');
  // Font loaded successfully
} catch (error) {
  console.error('Failed to load font:', error);
  // Handle error:
  // - Show error message to user
  // - Fall back to different font
  // - Retry with different path
}
```

## Future Enhancements

Potential improvements to consider:

1. **Font Preloading**: `MSDFString.preloadFonts(['Font1', 'Font2'])`
2. **Cache Limits**: Max cache size with LRU eviction
3. **Font Variants**: Support for font families (Regular, Bold, Italic)
4. **CDN Support**: Load from remote URLs
5. **Font Fallbacks**: Automatic fallback fonts
6. **Loading Progress**: Progress callbacks for large atlases

## Conclusion

The unified font loading architecture through `MSDFString` provides a clean, performant, and developer-friendly way to work with MSDF fonts. All font loading flows through a single, well-tested API, making the toolkit easier to use and maintain. 🎨

