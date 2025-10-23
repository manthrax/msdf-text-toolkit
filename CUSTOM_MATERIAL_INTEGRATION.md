# Custom Material Integration

`MSDFString` supports injecting MSDF text rendering into existing Three.js materials using the `material` parameter. This allows you to combine MSDF text with standard Three.js materials like `MeshStandardMaterial`, `MeshPhysicalMaterial`, etc.

## How It Works

When you provide a `material` parameter to `MSDFString`, it:

1. **Clones the material** to avoid modifying the original
2. **Adds MSDF uniforms** (texture, colors, thickness, etc.)
3. **Uses `onBeforeCompile`** to inject MSDF shader code into the material's shaders
4. **Preserves material features** like PBR lighting, environment maps, fog, etc.

The MSDF shader code is injected at strategic points:
- **Vertex Shader**: Adds instance attributes and calculates MSDF UV coordinates
- **Fragment Shader**: Samples the MSDF texture and applies the distance field algorithm
- **Final Output**: Blends MSDF rendering with the material's original output

## Usage

### Basic Example

```javascript
import * as THREE from 'three';
import { MSDFString } from './lib/MSDFString.js';

// Load font
await MSDFString.loadFont('MyFont', '/atlases');

// Create any Three.js material
const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  metalness: 0.5,
  roughness: 0.3
});

// Create text with the custom material
const textMesh = new MSDFString({
  font: 'MyFont',
  text: 'PBR Text!',
  material: material,      // Inject MSDF into this material
  fontSize: 0.01,
  color: '#60a5fa',
  thickness: 0.5,
  outlineThickness: 0.1,
  outlineColor: '#ff0088'
});

scene.add(textMesh);
```

### Advanced Example: Environment Mapping

```javascript
// Load environment map
const envMap = new THREE.CubeTextureLoader()
  .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);

// Create metallic material with env map
const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  metalness: 0.9,
  roughness: 0.1,
  envMap: envMap,
  envMapIntensity: 1.0
});

// Text will have metallic reflections!
const textMesh = new MSDFString({
  font: 'MyFont',
  text: 'Metallic!',
  material: material,
  fontSize: 0.02,
  color: '#ffffff',
  thickness: 0.5
});
```

## Supported Materials

The feature works with most Three.js materials that use `onBeforeCompile`:

### ✅ Fully Supported
- `MeshStandardMaterial` - PBR with metalness/roughness workflow
- `MeshPhysicalMaterial` - Advanced PBR with clearcoat, transmission, etc.
- `MeshLambertMaterial` - Simple diffuse lighting
- `MeshPhongMaterial` - Specular lighting
- `MeshToonMaterial` - Cel-shaded/cartoon rendering

### ⚠️ Limited Support
- `MeshBasicMaterial` - Works, but no lighting (similar to default behavior)
- `MeshMatcapMaterial` - Works, but matcap texture is replaced by MSDF
- `MeshDepthMaterial` - Works for depth rendering

### ❌ Not Supported
- `ShaderMaterial` - Use without the `material` parameter instead (default behavior)
- `RawShaderMaterial` - No `onBeforeCompile` support
- `ShadowMaterial` - Special-purpose material

## Features Available with Custom Materials

All `MSDFString` features work with custom materials:

```javascript
// All these methods work:
textMesh.setText('New Text!');
textMesh.setGlobalColor('#ff00ff');
textMesh.setGlobalOutlineColor('#00ffff');
textMesh.setGlobalThickness(0.6);
textMesh.setGlobalOutlineThickness(0.2);
textMesh.enableGlow();
textMesh.disableGlow();

// Per-character styling also works:
textMesh.setCharacterColor(0, '#ff0000');
textMesh.setCharacterThickness(0, 1.5, 0.3);
textMesh.setCharacterGlowMode(0, true);
```

## Material Properties

You can modify both MSDF properties and material properties independently:

```javascript
// MSDF properties
textMesh.setGlobalColor('#ff0000');
textMesh.enableGlow();

// Material properties (access via textMesh.material)
textMesh.material.metalness = 0.8;
textMesh.material.roughness = 0.2;
textMesh.material.needsUpdate = true;  // Required after changing material props
```

## Lighting Considerations

### With Standard Materials
When using `MeshStandardMaterial` or `MeshPhysicalMaterial`, your text will respond to scene lights:

```javascript
// Add lights to your scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1.0, 10);
pointLight.position.set(2, 2, 2);
scene.add(pointLight);

// Text will be lit by these lights
```

### Without Custom Material
Without a custom material, `MSDFString` uses a basic `ShaderMaterial` that doesn't respond to lights (similar to `MeshBasicMaterial`).

## Performance Considerations

1. **Material Cloning**: The material is cloned once during construction, so multiple `MSDFString` instances with the same base material will each have their own clone.

2. **Shader Compilation**: The first time a material+MSDF combination is used, the shader needs to be compiled. Subsequent instances will reuse the compiled shader.

3. **Uniforms**: MSDF uniforms are added to the material, but this has minimal performance impact.

4. **Instancing**: `MSDFString` still uses instanced rendering, so performance is excellent even with thousands of characters.

## Blending Behavior

The MSDF output is **multiplied** with the material's output:

```glsl
gl_FragColor = vec4(msdfColor * gl_FragColor.rgb, msdfAlpha * gl_FragColor.a);
```

This means:
- **Color**: MSDF text color is tinted by the material's color
- **Alpha**: MSDF alpha is multiplied with material alpha
- **Lighting**: Material's lighting calculations are preserved

If you want pure MSDF colors without material tinting, set the material's color to white:

```javascript
material.color.set(0xffffff);  // White = no tinting
```

## Troubleshooting

### Text appears too dark/bright
Adjust the material's base color or the MSDF color:
```javascript
textMesh.material.color.set(0xffffff);  // Brighter
textMesh.setGlobalColor('#808080');     // Darker text
```

### Text doesn't respond to lights
Make sure you're using a lit material (Standard, Physical, Lambert, Phong) and have lights in your scene.

### Material changes don't apply
Remember to set `needsUpdate` after changing material properties:
```javascript
textMesh.material.metalness = 0.9;
textMesh.material.needsUpdate = true;
```

### Shader errors
If you see shader compilation errors, the material might not be compatible with the injection method. Try using `MSDFString` without the `material` parameter (default behavior).

## Examples

See these examples for working implementations:
- `examples/standard-material.html` - Basic PBR text with interactive controls
- More examples coming soon!

## Technical Details

### Shader Injection Points

**Vertex Shader:**
```glsl
// After #include <common>
attribute vec4 uvOffset;
attribute vec4 instanceColor;
attribute vec4 instanceOutlineColor;
attribute vec2 instanceThickness;
attribute float instanceGlowMode;

varying vec2 vMsdfUv;
varying vec4 vInstanceColor;
// ... more varyings

// After #include <uv_vertex>
vMsdfUv = vec2(
  uvOffset.x + uv.x * uvOffset.z,
  uvOffset.y + uv.y * uvOffset.w
);
vInstanceColor = instanceColor;
// ... more varying assignments
```

**Fragment Shader:**
```glsl
// After #include <common>
uniform sampler2D msdfTexture;
uniform vec3 globalColor;
uniform vec3 globalOutlineColor;
// ... more uniforms

float median(float r, float g, float b) {
  return max(min(r, g), min(max(r, g), b));
}

// After #include <dithering_fragment>
// MSDF sampling and rendering logic
// Blends with gl_FragColor
```

### Uniform Access

All MSDF uniforms are stored in `material.uniforms` and can be accessed directly:

```javascript
console.log(textMesh.material.uniforms.globalColor.value);
console.log(textMesh.material.uniforms.globalThickness.value);
```

However, it's recommended to use the `MSDFString` methods instead:
```javascript
textMesh.setGlobalColor('#ff0000');  // Preferred
textMesh.setGlobalThickness(0.6);    // Preferred
```

