/**
 * MSDFString - Instanced MSDF text rendering for Three.js
 * 
 * Hybrid control system:
 * - Global uniforms control ALL characters
 * - Per-instance attributes control INDIVIDUAL characters  
 * - Final result = uniform × instance (multiplicative)
 */

import * as THREE from 'three';
import { msdfVertexShader, msdfFragmentShader } from './shaders.js';

export class MSDFString extends THREE.InstancedMesh {
  // Static font cache
  static fontCache = new Map();
  static defaultBasePath = '/atlases';
  
  /**
   * Load and cache a font atlas (async)
   * @param {string} fontName - Name of the font (e.g., 'Montserrat-Bold')
   * @param {string} basePath - Base path to atlases folder (default: '/atlases')
   * @returns {Promise<{texture: THREE.Texture, data: Object}>}
   */
  static async loadFont(fontName, basePath = MSDFString.defaultBasePath) {
    // Check if already cached
    if (MSDFString.fontCache.has(fontName)) {
      return MSDFString.fontCache.get(fontName);
    }

    // Load texture and JSON in parallel
    const [texture, data] = await Promise.all([
      new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
          `${basePath}/${fontName}.png`,
          (tex) => {
            tex.colorSpace = THREE.NoColorSpace;
            tex.minFilter = THREE.LinearMipMapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.flipY = false;
            tex.generateMipmaps = true;
            resolve(tex);
          },
          undefined,
          reject
        );
      }),
      fetch(`${basePath}/${fontName}.json`).then(res => res.json())
    ]);

    const fontData = { texture, data };
    MSDFString.fontCache.set(fontName, fontData);
    return fontData;
  }

  /**
   * Get a cached font (synchronous)
   * @param {string} fontName - Name of the font
   * @returns {{texture: THREE.Texture, data: Object} | null}
   */
  static getFont(fontName) {
    return MSDFString.fontCache.get(fontName) || null;
  }

  /**
   * Clear font cache (useful for cleanup)
   */
  static clearFontCache() {
    for (const [name, fontData] of MSDFString.fontCache) {
      if (fontData.texture) {
        fontData.texture.dispose();
      }
    }
    MSDFString.fontCache.clear();
  }

  constructor(options = {}) {
    const {
      font = null,              // Font atlas data {texture, data} OR font name string
      text = '',                // Initial text
      color = '#ffffff',        // Global color (or THREE.Color)
      outlineColor = '#000000', // Global outline color
      thickness = 0.5,          // Global thickness
      outlineThickness = 0.0,   // Global outline thickness
      maxLength = null,         // Max character capacity (auto if null)
      material = null           // Optional: existing Three.js material to inject MSDF into
    } = options;

    // Handle font parameter - can be an object or a string name
    let fontData;
    if (typeof font === 'string') {
      // Try to get from cache
      fontData = MSDFString.getFont(font);
      if (!fontData) {
        throw new Error(`Font '${font}' not loaded. Call MSDFString.loadFont('${font}') first.`);
      }
    } else if (font && font.texture && font.data) {
      // Direct font object passed
      fontData = font;
    } else {
      throw new Error('MSDFString requires either a font name (string) or font object with {texture, data}');
    }

    const capacity = maxLength || Math.max(text.length, 100);
    
    // Create base geometry
    const geometry = new THREE.PlaneGeometry(1, 1);
    
    // Create or modify material
    let finalMaterial;
    if (material) {
      // User provided a material - inject MSDF functionality using onBeforeCompile
      finalMaterial = material.clone();
      this._injectMSDFIntoMaterial(finalMaterial, fontData, {
        color: new THREE.Color(color),
        outlineColor: new THREE.Color(outlineColor),
        thickness,
        outlineThickness
      });
    } else {
      // No material provided - use custom ShaderMaterial (original behavior)
      finalMaterial = new THREE.ShaderMaterial({
        uniforms: {
          msdfTexture: { value: fontData.texture },
          // Global controls (applied to ALL characters)
          globalColor: { value: new THREE.Color(color) },
          globalOutlineColor: { value: new THREE.Color(outlineColor) },
          globalThickness: { value: thickness },
          globalOutlineThickness: { value: outlineThickness },
          globalSmoothness: { value: 0.05 },
          globalGlowMode: { value: 0.0 } // 0.0 = hard outline, 1.0 = glow
        },
        vertexShader: msdfVertexShader,
        fragmentShader: msdfFragmentShader,
        transparent: true,
        depthTest: true,
        depthWrite: true
      });
    }

    super(geometry, finalMaterial, capacity);

    // Store font data
    this.font = fontData;
    this.capacity = capacity;
    this._text = '';
    this._glyphMap = new Map();
    
    // Build glyph map
    for (const charData of fontData.data.chars) {
      this._glyphMap.set(String.fromCharCode(charData.id), charData);
    }

    // Create per-instance attribute buffers
    const uvOffset = new Float32Array(capacity * 4);        // UV rect per char
    const instanceColor = new Float32Array(capacity * 4);   // RGBA per char
    const instanceOutlineColor = new Float32Array(capacity * 4); // RGBA outline per char
    const instanceThickness = new Float32Array(capacity * 2); // [thickness, outlineThickness] per char
    const instanceGlowMode = new Float32Array(capacity);    // Glow mode per char (0.0 or 1.0)

    geometry.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(uvOffset, 4));
    geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(instanceColor, 4));
    geometry.setAttribute('instanceOutlineColor', new THREE.InstancedBufferAttribute(instanceOutlineColor, 4));
    geometry.setAttribute('instanceThickness', new THREE.InstancedBufferAttribute(instanceThickness, 2));
    geometry.setAttribute('instanceGlowMode', new THREE.InstancedBufferAttribute(instanceGlowMode, 1));

    // Initialize all characters to white with full opacity and default thickness
    for (let i = 0; i < capacity; i++) {
      instanceColor[i * 4 + 0] = 1.0; // R
      instanceColor[i * 4 + 1] = 1.0; // G
      instanceColor[i * 4 + 2] = 1.0; // B
      instanceColor[i * 4 + 3] = 1.0; // A
      
      instanceOutlineColor[i * 4 + 0] = 1.0;
      instanceOutlineColor[i * 4 + 1] = 1.0;
      instanceOutlineColor[i * 4 + 2] = 1.0;
      instanceOutlineColor[i * 4 + 3] = 1.0;

      instanceThickness[i * 2 + 0] = 1.0; // thickness multiplier
      instanceThickness[i * 2 + 1] = 1.0; // outline thickness multiplier
      
      instanceGlowMode[i] = 1.0; // default to glow enabled per-instance
    }

    // Set initial text if provided
    if (text) {
      this.setText(text);
    }
  }

  /**
   * Inject MSDF rendering into an existing Three.js material using onBeforeCompile
   * @private
   */
  _injectMSDFIntoMaterial(material, fontData, params) {
    // Add MSDF uniforms to the material
    material.uniforms = material.uniforms || {};
    material.uniforms.msdfTexture = { value: fontData.texture };
    material.uniforms.globalColor = { value: params.color };
    material.uniforms.globalOutlineColor = { value: params.outlineColor };
    material.uniforms.globalThickness = { value: params.thickness };
    material.uniforms.globalOutlineThickness = { value: params.outlineThickness };
    material.uniforms.globalSmoothness = { value: 0.05 };
    material.uniforms.globalGlowMode = { value: 0.0 };

    // Mark material as needing transparency
    material.transparent = true;

    // Use onBeforeCompile to inject MSDF shader code
    material.onBeforeCompile = (shader) => {
      // Add MSDF uniforms to shader
      shader.uniforms.msdfTexture = material.uniforms.msdfTexture;
      shader.uniforms.globalColor = material.uniforms.globalColor;
      shader.uniforms.globalOutlineColor = material.uniforms.globalOutlineColor;
      shader.uniforms.globalThickness = material.uniforms.globalThickness;
      shader.uniforms.globalOutlineThickness = material.uniforms.globalOutlineThickness;
      shader.uniforms.globalSmoothness = material.uniforms.globalSmoothness;
      shader.uniforms.globalGlowMode = material.uniforms.globalGlowMode;

      // Inject instance attributes in vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        attribute vec4 uvOffset; // x, y = offset in atlas; z, w = width, height
        attribute vec4 instanceColor;
        attribute vec4 instanceOutlineColor;
        attribute vec2 instanceThickness;
        attribute float instanceGlowMode;
        
        varying vec2 vMsdfUv;
        varying vec4 vInstanceColor;
        varying vec4 vInstanceOutlineColor;
        varying vec2 vInstanceThickness;
        varying float vInstanceGlowMode;
        `
      );

      // Calculate MSDF UVs in vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        // Calculate MSDF UV coordinates for this glyph
        vMsdfUv = vec2(
          uvOffset.x + uv.x * uvOffset.z,
          uvOffset.y + uv.y * uvOffset.w
        );
        vInstanceColor = instanceColor;
        vInstanceOutlineColor = instanceOutlineColor;
        vInstanceThickness = instanceThickness;
        vInstanceGlowMode = instanceGlowMode;
        `
      );

      // Add MSDF sampling and rendering in fragment shader
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D msdfTexture;
        uniform vec3 globalColor;
        uniform vec3 globalOutlineColor;
        uniform float globalThickness;
        uniform float globalOutlineThickness;
        uniform float globalSmoothness;
        uniform float globalGlowMode;
        
        varying vec2 vMsdfUv;
        varying vec4 vInstanceColor;
        varying vec4 vInstanceOutlineColor;
        varying vec2 vInstanceThickness;
        varying float vInstanceGlowMode;
        
        float median(float r, float g, float b) {
          return max(min(r, g), min(max(r, g), b));
        }
        `
      );

      // Apply MSDF rendering at the end (replace or modify final color)
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        
        // MSDF text rendering
        vec3 msd = texture2D(msdfTexture, vMsdfUv).rgb;
        float sd = median(msd.r, msd.g, msd.b);
        
        vec2 Jdx = dFdx(msd.rg);
        vec2 Jdy = dFdy(msd.rg);
        float pixelDist = sqrt(dot(Jdx, Jdx) + dot(Jdy, Jdy));
        float w = max(pixelDist, 0.0001);
        
        float finalThickness = globalThickness * vInstanceThickness.x;
        float finalOutlineThickness = globalOutlineThickness * vInstanceThickness.y;
        float finalGlowMode = globalGlowMode * vInstanceGlowMode;
        
        float innerEdge = finalThickness;
        float innerDist = (sd - innerEdge) / w;
        float innerAlpha = clamp(innerDist + 0.5, 0.0, 1.0);
        innerAlpha = smoothstep(0.5 - globalSmoothness, 0.5 + globalSmoothness, innerAlpha);
        
        float outerEdge = finalThickness - finalOutlineThickness;
        float outerDist = (sd - outerEdge) / w;
        float outerAlpha = clamp(outerDist + 0.5, 0.0, 1.0);
        outerAlpha = smoothstep(0.5 - globalSmoothness, 0.5 + globalSmoothness, outerAlpha);
        
        vec3 fillColor = globalColor * vInstanceColor.rgb;
        vec3 outlineColorFinal = globalOutlineColor * vInstanceOutlineColor.rgb;
        
        vec3 msdfColor;
        float msdfAlpha;
        
        if (finalGlowMode > 0.5) {
          // Glow mode
          if (innerAlpha > 0.5) {
            msdfColor = fillColor;
            msdfAlpha = 1.0 * vInstanceColor.a;
          } else {
            msdfColor = outlineColorFinal;
            float edgeDist = (sd - outerEdge) / (innerEdge - outerEdge);
            float fadeAmount = smoothstep(0.0, 1.0, edgeDist);
            fadeAmount = fadeAmount * fadeAmount;
            msdfAlpha = fadeAmount * vInstanceColor.a;
          }
        } else {
          // Hard outline mode
          float outlineMask = outerAlpha * (1.0 - innerAlpha);
          msdfColor = mix(fillColor, outlineColorFinal, outlineMask);
          msdfAlpha = outerAlpha * vInstanceColor.a;
        }
        
        if (msdfAlpha < 0.01) discard;
        
        // Blend MSDF rendering with material's output
        gl_FragColor = vec4(msdfColor * gl_FragColor.rgb, msdfAlpha * gl_FragColor.a);
        `
      );

      // Store modified shader for potential reuse
      material.userData.msdfShader = shader;
    };

    // Force recompilation
    material.needsUpdate = true;
  }

  /**
   * Resize the instanced mesh to accommodate more characters
   */
  _resize(newCapacity) {
    const oldCapacity = this.capacity;
    const geometry = this.geometry;
    
    // Create new attribute arrays with larger capacity
    const newUvOffset = new Float32Array(newCapacity * 4);
    const newInstanceColor = new Float32Array(newCapacity * 4);
    const newInstanceOutlineColor = new Float32Array(newCapacity * 4);
    const newInstanceThickness = new Float32Array(newCapacity * 2);
    const newInstanceGlowMode = new Float32Array(newCapacity);
    
    // Copy existing data
    const oldUvOffset = geometry.attributes.uvOffset.array;
    const oldInstanceColor = geometry.attributes.instanceColor.array;
    const oldInstanceOutlineColor = geometry.attributes.instanceOutlineColor.array;
    const oldInstanceThickness = geometry.attributes.instanceThickness.array;
    const oldInstanceGlowMode = geometry.attributes.instanceGlowMode.array;
    
    newUvOffset.set(oldUvOffset);
    newInstanceColor.set(oldInstanceColor);
    newInstanceOutlineColor.set(oldInstanceOutlineColor);
    newInstanceThickness.set(oldInstanceThickness);
    newInstanceGlowMode.set(oldInstanceGlowMode);
    
    // Initialize new elements to default values
    for (let i = oldCapacity; i < newCapacity; i++) {
      newInstanceColor[i * 4 + 0] = 1.0;
      newInstanceColor[i * 4 + 1] = 1.0;
      newInstanceColor[i * 4 + 2] = 1.0;
      newInstanceColor[i * 4 + 3] = 1.0;
      
      newInstanceOutlineColor[i * 4 + 0] = 1.0;
      newInstanceOutlineColor[i * 4 + 1] = 1.0;
      newInstanceOutlineColor[i * 4 + 2] = 1.0;
      newInstanceOutlineColor[i * 4 + 3] = 1.0;
      
      newInstanceThickness[i * 2 + 0] = 1.0;
      newInstanceThickness[i * 2 + 1] = 1.0;
      
      newInstanceGlowMode[i] = 1.0;
    }
    
    // Update geometry attributes
    geometry.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(newUvOffset, 4));
    geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(newInstanceColor, 4));
    geometry.setAttribute('instanceOutlineColor', new THREE.InstancedBufferAttribute(newInstanceOutlineColor, 4));
    geometry.setAttribute('instanceThickness', new THREE.InstancedBufferAttribute(newInstanceThickness, 2));
    geometry.setAttribute('instanceGlowMode', new THREE.InstancedBufferAttribute(newInstanceGlowMode, 1));
    
    // Update capacity
    this.capacity = newCapacity;
    
    console.log(`MSDFString: Resized from ${oldCapacity} to ${newCapacity} characters`);
  }

  /**
   * Set the entire text string
   */
  setText(text, options = {}) {
    const {
      fontSize = 1.0,
      align = 'left',    // 'left', 'center', 'right'
      lineHeight = 1.2
    } = options;

    this._text = text;
    
    // Check if we need to resize
    const textLength = text.length;
    if (textLength > this.capacity) {
      // Resize to accommodate the text with some buffer (1.5x the needed size)
      const newCapacity = Math.ceil(textLength * 1.5);
      this._resize(newCapacity);
    }
    
    const lines = text.split('\n');
    
    const geometry = this.geometry;
    const uvOffset = geometry.attributes.uvOffset.array;
    const dummy = new THREE.Object3D();
    
    const texW = this.font.data.common.scaleW;
    const texH = this.font.data.common.scaleH;
    const scale = fontSize / this.font.data.info.size;
    
    let charIdx = 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      
      // Calculate line width for alignment
      let lineWidth = 0;
      for (const char of line) {
        const glyph = this._glyphMap.get(char);
        if (glyph) {
          lineWidth += glyph.xadvance * scale;
        }
      }

      let xOffset = 0;
      if (align === 'center') xOffset = -lineWidth / 2;
      else if (align === 'right') xOffset = -lineWidth;

      const yOffset = (lines.length / 2 - lineIdx - 0.5) * lineHeight * fontSize;

      // Layout characters
      for (const char of line) {
        const glyph = this._glyphMap.get(char);
        
        if (!glyph) {
          xOffset += fontSize * scale * 0.3;
          continue;
        }

        const glyphWidth = glyph.width * scale;
        const glyphHeight = glyph.height * scale;
        const xPos = xOffset + glyph.xoffset * scale + glyphWidth / 2;
        const yPos = yOffset - glyph.yoffset * scale - glyphHeight / 2;

        // Position
        dummy.position.set(xPos, yPos, 0);
        dummy.scale.set(glyphWidth, glyphHeight, 1);
        dummy.updateMatrix();
        this.setMatrixAt(charIdx, dummy.matrix);

        // UV coordinates
        uvOffset[charIdx * 4 + 0] = glyph.x / texW;
        uvOffset[charIdx * 4 + 1] = (glyph.y + glyph.height) / texH;
        uvOffset[charIdx * 4 + 2] = glyph.width / texW;
        uvOffset[charIdx * 4 + 3] = -glyph.height / texH;

        xOffset += glyph.xadvance * scale;
        charIdx++;
      }
    }

    // Hide unused characters
    for (let i = charIdx; i < this.capacity; i++) {
      dummy.position.set(0, 0, -10000);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.setMatrixAt(i, dummy.matrix);
    }

    this.count = charIdx;
    this.instanceMatrix.needsUpdate = true;
    geometry.attributes.uvOffset.needsUpdate = true;
  }

  /**
   * Set color for a specific character
   */
  setCharacterColor(index, color, alpha = 1.0) {
    if (index < 0 || index >= this.count) return;
    
    const colorObj = new THREE.Color(color);
    const colors = this.geometry.attributes.instanceColor.array;
    
    colors[index * 4 + 0] = colorObj.r;
    colors[index * 4 + 1] = colorObj.g;
    colors[index * 4 + 2] = colorObj.b;
    colors[index * 4 + 3] = alpha;
    
    this.geometry.attributes.instanceColor.needsUpdate = true;
  }

  /**
   * Set outline color for a specific character
   */
  setCharacterOutlineColor(index, color, alpha = 1.0) {
    if (index < 0 || index >= this.count) return;
    
    const colorObj = new THREE.Color(color);
    const colors = this.geometry.attributes.instanceOutlineColor.array;
    
    colors[index * 4 + 0] = colorObj.r;
    colors[index * 4 + 1] = colorObj.g;
    colors[index * 4 + 2] = colorObj.b;
    colors[index * 4 + 3] = alpha;
    
    this.geometry.attributes.instanceOutlineColor.needsUpdate = true;
  }

  /**
   * Set thickness for a specific character
   */
  setCharacterThickness(index, thickness = 1.0, outlineThickness = 1.0) {
    if (index < 0 || index >= this.count) return;
    
    const thicknesses = this.geometry.attributes.instanceThickness.array;
    thicknesses[index * 2 + 0] = thickness;
    thicknesses[index * 2 + 1] = outlineThickness;
    
    this.geometry.attributes.instanceThickness.needsUpdate = true;
  }

  /**
   * Set glow mode for a specific character
   * @param {number} index - Character index
   * @param {boolean} enableGlow - true for glow, false for hard outline
   */
  setCharacterGlowMode(index, enableGlow) {
    if (index < 0 || index >= this.count) return;
    
    const glowModes = this.geometry.attributes.instanceGlowMode.array;
    glowModes[index] = enableGlow ? 1.0 : 0.0;
    
    this.geometry.attributes.instanceGlowMode.needsUpdate = true;
  }

  /**
   * Set global color (affects all characters)
   */
  setGlobalColor(color) {
    this.material.uniforms.globalColor.value.set(color);
  }

  /**
   * Set global outline color (affects all characters)
   */
  setGlobalOutlineColor(color) {
    this.material.uniforms.globalOutlineColor.value.set(color);
  }

  /**
   * Set global thickness (affects all characters)
   */
  setGlobalThickness(thickness) {
    this.material.uniforms.globalThickness.value = thickness;
  }

  /**
   * Set global outline thickness (affects all characters)
   */
  setGlobalOutlineThickness(thickness) {
    this.material.uniforms.globalOutlineThickness.value = thickness;
  }

  /**
   * Set global glow mode (0.0 = hard outline, 1.0 = glow/shadow)
   * @param {number} glowMode - 0.0 for hard outline, 1.0 for glow
   */
  setGlobalGlowMode(glowMode) {
    this.material.uniforms.globalGlowMode.value = glowMode;
  }

  /**
   * Enable glow mode globally (soft alpha fade)
   */
  enableGlow() {
    this.setGlobalGlowMode(1.0);
  }

  /**
   * Disable glow mode globally (hard outline)
   */
  disableGlow() {
    this.setGlobalGlowMode(0.0);
  }

  /**
   * Get current text
   */
  getText() {
    return this._text;
  }

  /**
   * Get character count
   */
  getLength() {
    return this.count;
  }

  /**
   * Reset all per-character attributes to defaults
   */
  resetCharacterAttributes() {
    const colors = this.geometry.attributes.instanceColor.array;
    const outlineColors = this.geometry.attributes.instanceOutlineColor.array;
    const thicknesses = this.geometry.attributes.instanceThickness.array;
    const glowModes = this.geometry.attributes.instanceGlowMode.array;

    for (let i = 0; i < this.capacity; i++) {
      colors[i * 4 + 0] = 1.0;
      colors[i * 4 + 1] = 1.0;
      colors[i * 4 + 2] = 1.0;
      colors[i * 4 + 3] = 1.0;
      
      outlineColors[i * 4 + 0] = 1.0;
      outlineColors[i * 4 + 1] = 1.0;
      outlineColors[i * 4 + 2] = 1.0;
      outlineColors[i * 4 + 3] = 1.0;

      thicknesses[i * 2 + 0] = 1.0;
      thicknesses[i * 2 + 1] = 1.0;
      
      glowModes[i] = 1.0; // default to glow enabled
    }

    this.geometry.attributes.instanceColor.needsUpdate = true;
    this.geometry.attributes.instanceOutlineColor.needsUpdate = true;
    this.geometry.attributes.instanceThickness.needsUpdate = true;
    this.geometry.attributes.instanceGlowMode.needsUpdate = true;
  }
}


