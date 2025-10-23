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
  constructor(options = {}) {
    const {
      font = null,              // Font atlas data {texture, json}
      text = '',                // Initial text
      color = '#ffffff',        // Global color (or THREE.Color)
      outlineColor = '#000000', // Global outline color
      thickness = 0.5,          // Global thickness
      outlineThickness = 0.0,   // Global outline thickness
      maxLength = null          // Max character capacity (auto if null)
    } = options;

    if (!font || !font.texture || !font.data) {
      throw new Error('MSDFString requires font object with {texture, data}');
    }

    const capacity = maxLength || Math.max(text.length, 100);
    
    // Create base geometry and material
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        msdfTexture: { value: font.texture },
        // Global controls (applied to ALL characters)
        globalColor: { value: new THREE.Color(color) },
        globalOutlineColor: { value: new THREE.Color(outlineColor) },
        globalThickness: { value: thickness },
        globalOutlineThickness: { value: outlineThickness },
        globalSmoothness: { value: 0.05 }
      },
      vertexShader: msdfVertexShader,
      fragmentShader: msdfFragmentShader,
      transparent: true,
      depthTest: true,
      depthWrite: true
    });

    super(geometry, material, capacity);

    // Store font data
    this.font = font;
    this.capacity = capacity;
    this._text = '';
    this._glyphMap = new Map();
    
    // Build glyph map
    for (const charData of font.data.chars) {
      this._glyphMap.set(String.fromCharCode(charData.id), charData);
    }

    // Create per-instance attribute buffers
    const uvOffset = new Float32Array(capacity * 4);        // UV rect per char
    const instanceColor = new Float32Array(capacity * 4);   // RGBA per char
    const instanceOutlineColor = new Float32Array(capacity * 4); // RGBA outline per char
    const instanceThickness = new Float32Array(capacity * 2); // [thickness, outlineThickness] per char

    geometry.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(uvOffset, 4));
    geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(instanceColor, 4));
    geometry.setAttribute('instanceOutlineColor', new THREE.InstancedBufferAttribute(instanceOutlineColor, 4));
    geometry.setAttribute('instanceThickness', new THREE.InstancedBufferAttribute(instanceThickness, 2));

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
    }

    // Set initial text if provided
    if (text) {
      this.setText(text);
    }
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
        if (charIdx >= this.capacity) {
          console.warn(`MSDFString: Text exceeds capacity (${this.capacity})`);
          break;
        }

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
    }

    this.geometry.attributes.instanceColor.needsUpdate = true;
    this.geometry.attributes.instanceOutlineColor.needsUpdate = true;
    this.geometry.attributes.instanceThickness.needsUpdate = true;
  }
}

