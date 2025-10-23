# Glow Mode Feature

## Overview

The MSDF Text Toolkit now supports **Glow Mode** - a rendering mode that creates soft, alpha-faded edges for glowing or shadowed text effects. This is an alternative to the traditional hard-edged outline mode.

## What's the Difference?

### Hard Outline Mode (Default: OFF)
- Traditional sharp outline
- Crisp, defined edges
- Outline color appears as a solid border around text
- Good for legibility and clear text

### Glow Mode (Enabled: ON)
- Soft, fading alpha at the outer edge
- Creates a glow or shadow effect
- Outline color fades smoothly from inner edge to transparent
- Great for atmospheric effects, shadows, and glowing text

## Visual Comparison

```
Hard Outline:  ████████  ◄── Sharp edge
               ████████
               ████████

Glow Mode:     ████████  ◄── Solid center
               ▓▓▓▓▓▓▓▓  ◄── Fades to transparent
               ░░░░░░░░  ◄── Very transparent
                         ◄── Fully transparent
```

## API Usage

### Global Controls

```javascript
import { MSDFString } from './lib/MSDFString.js';

// Create text
const textMesh = new MSDFString({
  font: 'MyFont',
  text: 'Hello World!',
  outlineColor: '#ff0000',      // Glow/outline color
  outlineThickness: 0.15         // Glow/outline size
});

// Enable glow mode
textMesh.enableGlow();

// Disable glow mode (back to hard outline)
textMesh.disableGlow();

// Or set manually (0.0 = hard, 1.0 = glow)
textMesh.setGlobalGlowMode(1.0);
```

### Per-Character Controls

```javascript
// Enable glow for a specific character
textMesh.setCharacterGlowMode(5, true);   // Index 5: glow ON

// Disable glow for a specific character
textMesh.setCharacterGlowMode(10, false); // Index 10: glow OFF
```

### Mixed Modes

You can mix glow and hard outline modes within the same text:

```javascript
const text = "GLOW TEST";
const textMesh = new MSDFString({
  font: 'MyFont',
  text: text,
  outlineColor: '#ff00ff',
  outlineThickness: 0.2
});

// Enable glow globally first
textMesh.enableGlow();

// Then disable it for specific characters to create contrast
for (let i = 0; i < 4; i++) {
  textMesh.setCharacterGlowMode(i, false); // "GLOW" = hard outline
}
// "TEST" keeps the glow effect

scene.add(textMesh);
```

## Shader Implementation

The glow effect is implemented at the shader level for optimal performance:

### How It Works

1. **Distance Field Sampling**: The MSDF texture stores distance information
2. **Edge Detection**: Inner edge = fill boundary, Outer edge = glow boundary
3. **Alpha Fade**: In glow mode, alpha smoothly transitions from solid to transparent
4. **Color Blending**: Outline/glow color mixes with fill color based on distance

### Shader Logic

```glsl
if (glowMode > 0.5) {
  // GLOW MODE: Soft fade
  finalColor = mix(outlineColor, fillColor, innerAlpha);
  finalAlpha = outerAlpha * instanceAlpha; // Fades to transparent
} else {
  // HARD OUTLINE MODE: Sharp edges
  float outlineMask = outerAlpha * (1.0 - innerAlpha);
  finalColor = mix(fillColor, outlineColor, outlineMask);
  finalAlpha = outerAlpha * instanceAlpha; // Sharp cutoff
}
```

## Use Cases

### 1. Glowing Neon Text
```javascript
textMesh.setGlobalColor('#ffffff');
textMesh.setGlobalOutlineColor('#00ffff'); // Cyan glow
textMesh.setGlobalOutlineThickness(0.2);
textMesh.enableGlow();
```

### 2. Drop Shadow Effect
```javascript
textMesh.setGlobalColor('#ffffff');
textMesh.setGlobalOutlineColor('#000000'); // Black shadow
textMesh.setGlobalOutlineThickness(0.15);
textMesh.enableGlow();
```

### 3. Soft Outline
```javascript
textMesh.setGlobalColor('#ff0000');
textMesh.setGlobalOutlineColor('#990000'); // Darker red glow
textMesh.setGlobalOutlineThickness(0.1);
textMesh.enableGlow();
```

### 4. Mixed Emphasis
```javascript
// Make important words glow, keep others sharp
const importantWords = [0, 1, 2, 3]; // First word
importantWords.forEach(i => {
  textMesh.setCharacterGlowMode(i, true);
  textMesh.setCharacterOutlineColor(i, '#ffff00', 1.0);
});
```

## Integration with Basic Demo

The basic demo now includes a glow mode checkbox:

```html
<input type="checkbox" id="glowMode">
<label>Glow Mode (soft alpha fade)</label>
```

**Try it:**
1. Open `examples/basic.html`
2. Check the "Glow Mode" checkbox
3. Adjust "Outline" thickness and color to see the glow effect
4. Click on individual characters to apply different glow modes per-character

## Performance

- **Negligible overhead**: The glow mode uses a simple `if` statement in the shader
- **Same texture data**: No additional texture lookups
- **Per-instance control**: Each character can have its own mode without performance penalty
- **GPU-accelerated**: All blending happens in fragment shader

## Technical Details

### Attributes

- **Global**: `globalGlowMode` uniform (float, 0.0-1.0)
- **Per-Instance**: `instanceGlowMode` attribute (float, 0.0 or 1.0)
- **Hybrid Control**: Final glow mode = `globalGlowMode × instanceGlowMode`

### Default Behavior

- **Global default**: 0.0 (hard outline mode)
- **Instance default**: 1.0 (enabled, controlled by global)
- **Result**: Hard outline by default, but easily switchable

### Attribute Storage

- 1 float per character (4 bytes)
- For 1000 characters: 4KB additional memory
- Negligible compared to other attributes (colors, positions, etc.)

## Future Enhancements

Potential improvements:

1. **Glow Intensity**: Add a parameter to control fade curve
2. **Glow Spread**: Independent control of glow size vs outline size
3. **Dual Glow**: Inner and outer glow effects
4. **Animated Glow**: Time-based glow pulsing
5. **Directional Shadow**: Offset-based shadow effects

## Examples in the Wild

Check out these examples:
- `examples/basic.html` - Interactive glow mode toggle
- `examples/matrix-mode.html` - Matrix rain effect (could use glow!)

## API Reference

| Method | Parameters | Description |
|--------|-----------|-------------|
| `enableGlow()` | None | Enable glow mode globally |
| `disableGlow()` | None | Disable glow mode globally (hard outline) |
| `setGlobalGlowMode(value)` | `value: number (0.0-1.0)` | Set glow mode intensity globally |
| `setCharacterGlowMode(index, enable)` | `index: number, enable: boolean` | Set glow mode for specific character |

## Conclusion

Glow Mode adds versatility to the MSDF Text Toolkit, enabling soft, atmospheric text effects while maintaining the high quality and performance of the existing system. It's a simple toggle that unlocks a wide range of visual possibilities! ✨

