# MSDF Text Toolkit - Quick Reference

## 🚀 Common Commands

### Start Generator Server
```bash
cd generator/server
npm start
```
→ Open http://localhost:3001

### Install Server Dependencies
```bash
cd generator/server
npm install
```

### Run Example
```bash
# From toolkit root
npx http-server -p 8000
```
→ Open http://localhost:8000/examples/basic.html

---

## 📝 Basic Usage Pattern

```javascript
import { MSDFTextRenderer, solidColor } from './lib/MSDFTextRenderer.js';

// 1. Create renderer
const textRenderer = new MSDFTextRenderer(scene);

// 2. Load font
await textRenderer.loadFont('myFont', 'atlas.png', 'atlas.json');

// 3. Create text
const { id, mesh } = textRenderer.createText({
  fontName: 'myFont',
  text: 'Hello!',
  scale: 0.01
});

// 4. Update (optional)
textRenderer.updateText(id, 'New text');
textRenderer.updateParams(id, { thickness: 0.6 });
```

---

## 🎨 Color Functions Cheat Sheet

```javascript
import { solidColor, rainbowGradient, alternatingColors } from './lib/MSDFTextRenderer.js';

// Solid color (hex or THREE.Color)
colorFunction: solidColor(0x60a5fa)

// Rainbow gradient
colorFunction: rainbowGradient

// Alternating colors
colorFunction: alternatingColors(0xff0000, 0x00ff00, 0x0000ff)

// Custom function
colorFunction: (charIndex, totalChars) => {
  return new THREE.Color(Math.random(), Math.random(), Math.random());
}
```

---

## ⚙️ createText() Options

```javascript
textRenderer.createText({
  fontName: 'myFont',           // Required
  text: 'Hello\nWorld',         // Required (\n for newlines)
  scale: 0.01,                  // 0.005-0.02 typical
  thickness: 0.5,               // 0.0-1.0, default 0.5
  smoothness: 0.05,             // 0.0-0.2, default 0.05
  outlineWidth: 0.1,            // 0.0-0.3, default 0.0
  outlineColor: 0x000000,       // hex color, default black
  colorFunction: solidColor(0x60a5fa)  // optional
})
```

---

## 🔧 Update Methods

```javascript
// Change text content
textRenderer.updateText(id, 'New text');

// Change rendering params
textRenderer.updateParams(id, {
  thickness: 0.6,
  outlineWidth: 0.15,
  outlineColor: 0xff0000
});

// Remove text
textRenderer.removeText(id);

// Get mesh for manual manipulation
const mesh = textRenderer.getMesh(id);
mesh.position.set(0, 1, 0);
mesh.rotation.y = Math.PI / 4;
```

---

## 🎯 Generator Settings

| Setting | Purpose | Recommended |
|---------|---------|-------------|
| **Field Type** | MSDF/SDF/PSDF | MSDF |
| **Font Size** | Resolution | 42px |
| **Atlas Width** | Texture width | 1024 |
| **Atlas Height** | Texture height | 1024 |
| **Distance Range** | SDF spread | 4 |

**Character Count Guide:**
- 1024x1024: ~95 ASCII characters
- 2048x2048: ~380 characters or full Unicode ranges

---

## 🐛 Troubleshooting

### Text not visible
```javascript
// Check camera is far enough back
camera.position.z = 5;

// Try different scale
scale: 0.015

// Check text is in view
mesh.position.set(0, 0, 0);
```

### Blurry text
```javascript
// Ensure correct thickness
thickness: 0.5

// Adjust smoothness
smoothness: 0.05
```

### Module errors
- Use local server (not file://)
- Check importmap in HTML
- Verify file paths are correct

### Generator not starting
```bash
# Ensure dependencies installed
cd generator/server
npm install

# Check port 3001 is free
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Mac/Linux
```

---

## 📦 File Locations

```
Load font from:     atlases/YourFont.png + .json
Import library:     lib/MSDFTextRenderer.js
Server config:      generator/server/package.json
Add fonts:          generator/fonts/
View examples:      examples/
```

---

## 💡 Tips & Tricks

**Performance:**
- Each text mesh uses instanced rendering (very fast!)
- Thousands of characters = minimal performance impact
- One material per text mesh, shared shader

**Quality:**
- Larger atlas = better quality
- fontSize 42-64 is sweet spot
- Distance range 4 works for most fonts

**Animation:**
- Access mesh directly: `textRenderer.getMesh(id)`
- Update uniforms for live effects
- Change per-instance colors in geometry

**Multi-font:**
```javascript
await textRenderer.loadFont('title', 'TitleFont.png', 'TitleFont.json');
await textRenderer.loadFont('body', 'BodyFont.png', 'BodyFont.json');

textRenderer.createText({ fontName: 'title', ... });
textRenderer.createText({ fontName: 'body', ... });
```

---

## 🔗 Quick Links

- Full API: `README.md`
- Tutorial: `GETTING_STARTED.md`
- Project Info: `PROJECT_SUMMARY.md`
- Generator UI: http://localhost:3001

---

## 📋 Checklist for New Project

- [ ] Copy/clone `msdf-text-toolkit/` to your project
- [ ] Install server deps: `cd generator/server && npm install`
- [ ] Start server: `npm start`
- [ ] Generate atlas for your font
- [ ] Save atlas PNG + JSON to `atlases/`
- [ ] Import library in your HTML
- [ ] Load font with `loadFont()`
- [ ] Create text with `createText()`
- [ ] Test and enjoy! 🎉

---

*For detailed documentation, see README.md*

