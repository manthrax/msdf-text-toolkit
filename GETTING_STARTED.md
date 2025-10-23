# Getting Started with MSDF Text Toolkit

This guide will walk you through setting up and using the MSDF Text Toolkit for the first time.

## Prerequisites

- **Node.js** 16 or higher
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Basic knowledge of Three.js (helpful but not required)

## Step 1: Install Dependencies

Navigate to the server directory and install required packages:

```bash
cd generator/server
npm install
```

This installs:
- `express` - Web server
- `cors` - Cross-origin resource sharing
- `multer` - File upload handling
- `msdf-bmfont-xml` - Native MSDF generation tool

## Step 2: Start the Generator Server

```bash
npm start
```

You should see:

```
======================================================================
  MSDF Generator Server
======================================================================
  Backend: http://localhost:3001/api
  Frontend: http://localhost:3001
======================================================================
```

## Step 3: Generate Your First Atlas

1. Open http://localhost:3001 in your browser
2. You'll see a list of pre-loaded fonts (if any in `generator/fonts/`)
3. Or upload your own TTF/OTF font file
4. Configure settings:
   - **Field Type**: MSDF (recommended)
   - **Font Size**: 42px (good default)
   - **Atlas Size**: 1024x1024 (standard)
   - **Distance Range**: 4 (good balance)
5. Click "Generate Atlas"
6. Wait for generation (a few seconds)
7. The preview will show the generated text

The server automatically saves generated atlases. You can download them from the UI if needed.

## Step 4: Copy Atlas Files

After generation, you need to save the atlas files:

1. Right-click on the atlas preview → "Save Image As..." → Save to `atlases/YourFont.png`
2. The JSON data is also available - save it as `atlases/YourFont.json`

Or use the download buttons in the UI (if available).

## Step 5: Create Your First Text

Create a new HTML file in the root directory:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My First MSDF Text</title>
  <style>
    body { margin: 0; overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
      }
    }
  </script>

  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { MSDFTextRenderer, solidColor } from './msdf-text-toolkit/lib/MSDFTextRenderer.js';

    // Setup Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Create text renderer
    const textRenderer = new MSDFTextRenderer(scene);

    // Load font and create text
    async function init() {
      await textRenderer.loadFont(
        'myFont',
        './msdf-text-toolkit/atlases/YourFont.png',  // ← Change to your font
        './msdf-text-toolkit/atlases/YourFont.json'  // ← Change to your font
      );

      textRenderer.createText({
        fontName: 'myFont',
        text: 'Hello MSDF!',
        scale: 0.02,
        thickness: 0.5,
        colorFunction: solidColor(0x00ff00)
      });
    }

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    init().then(animate);

    // Handle resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>
```

## Step 6: Serve Your Page

You need a local web server to run the example (due to ES modules):

**Option A: Using Python**
```bash
python -m http.server 8000
```

**Option B: Using Node http-server**
```bash
npx http-server -p 8000
```

**Option C: Using VS Code Live Server**
- Install "Live Server" extension
- Right-click HTML file → "Open with Live Server"

Then open http://localhost:8000 in your browser!

## Step 7: Experiment!

Try modifying the example:

**Change text:**
```javascript
const { id } = textRenderer.createText({ ... });
textRenderer.updateText(id, 'New text!');
```

**Add an outline:**
```javascript
textRenderer.updateParams(id, {
  outlineWidth: 0.1,
  outlineColor: 0xff0000
});
```

**Change colors:**
```javascript
import { rainbowGradient } from './msdf-text-toolkit/lib/MSDFTextRenderer.js';

colorFunction: rainbowGradient
```

**Multi-line text:**
```javascript
text: 'Line 1\nLine 2\nLine 3'
```

## Common Issues

### "Font not loaded" error
- Make sure the atlas PNG and JSON files exist in the `atlases/` directory
- Check that file paths are correct (relative to HTML file)
- Ensure the server is running if loading from the generator

### Text not visible
- Check camera position (try `camera.position.z = 5`)
- Adjust text `scale` parameter (try `0.01` to `0.02`)
- Verify the scene has proper lighting (MSDF text doesn't need lights)

### Blurry or pixelated text
- MSDF should always be sharp! If not:
  - Check that `thickness` is around 0.5
  - Try adjusting `smoothness` (0.05 is good)
  - Ensure texture is loaded with `flipY = false` (library handles this)

### Module import errors
- Must use a local web server (not `file://` protocol)
- Check importmap is correct for Three.js
- Verify all file paths are correct

## Next Steps

- Explore the `examples/` directory for more complex usage
- Read the full API documentation in `README.md`
- Try the Matrix example for advanced effects
- Generate atlases for multiple fonts
- Experiment with different color functions

## Tips

1. **Font Size**: 42px is a good default. Larger sizes (64-72) give better quality for very large text.

2. **Atlas Size**: 1024x1024 fits ~95 ASCII characters. Use 2048x2048 for full character sets or emoji.

3. **Distance Range**: 4 is optimal for most cases. Increase for very bold text, decrease for thin text.

4. **Performance**: Each text mesh uses instanced rendering. You can have thousands of characters with minimal performance impact.

5. **File Size**: MSDF atlases are typically 50-200KB depending on settings and character count.

## Support

For issues, questions, or contributions, please refer to the project repository or documentation.

Happy text rendering! 🎨

