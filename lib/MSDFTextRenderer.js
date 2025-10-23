/**
 * MSDF Text Renderer for Three.js
 * 
 * A lightweight, efficient library for rendering high-quality text using
 * Multi-channel Signed Distance Fields (MSDF) with Three.js instanced rendering.
 * 
 * @module MSDFTextRenderer
 * @author MSDF Text Toolkit
 * @license MIT
 */

import * as THREE from 'three';
import { msdfVertexShader, msdfFragmentShader } from './shaders.js';

/**
 * Main class for MSDF text rendering
 */
export class MSDFTextRenderer {
  /**
   * @param {THREE.Scene} scene - Three.js scene to render into
   */
  constructor(scene) {
    this.scene = scene;
    this.atlases = new Map(); // fontName -> { texture, data }
    this.textMeshes = new Map(); // id -> mesh
    this.nextId = 0;
  }

  /**
   * Load an MSDF atlas from generated files
   * @param {string} fontName - Unique identifier for this font
   * @param {string} atlasImageUrl - URL to the atlas PNG
   * @param {string} atlasDataUrl - URL to the atlas JSON
   * @returns {Promise<void>}
   */
  async loadFont(fontName, atlasImageUrl, atlasDataUrl) {
    try {
      // Load JSON data
      const response = await fetch(atlasDataUrl);
      const atlasData = await response.json();
      
      // Load texture
      const texture = await new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
          atlasImageUrl,
          (tex) => resolve(tex),
          undefined,
          (err) => reject(err)
        );
      });
      
      // Configure texture for MSDF rendering
      texture.colorSpace = THREE.NoColorSpace;
      texture.minFilter = THREE.LinearMipMapLinearFilter; // Trilinear filtering for better far-distance quality
      texture.magFilter = THREE.LinearFilter;
      texture.flipY = false;
      texture.generateMipmaps = true; // Ensure mipmaps are generated
      
      // Store atlas
      this.atlases.set(fontName, { texture, data: atlasData });
      
      return { success: true, fontName };
    } catch (error) {
      console.error(`Failed to load font "${fontName}":`, error);
      throw error;
    }
  }

  /**
   * Create a new text mesh
   * @param {Object} options - Text creation options
   * @param {string} options.fontName - Name of loaded font to use
   * @param {string} options.text - Text content to display
   * @param {number} [options.scale=0.01] - Scale factor (font units to world units)
   * @param {number} [options.thickness=0.5] - Text thickness (0-1)
   * @param {number} [options.smoothness=0.05] - Edge smoothness (0-1)
   * @param {number} [options.outlineWidth=0.0] - Outline width (0-0.3)
   * @param {THREE.Color|number} [options.outlineColor=0x000000] - Outline color
   * @param {Function} [options.colorFunction] - Function(charIndex, totalChars) => THREE.Color
   * @returns {Object} - { id, mesh } where id can be used for updates
   */
  createText(options) {
    const {
      fontName,
      text,
      scale = 0.01,
      thickness = 0.5,
      smoothness = 0.05,
      outlineWidth = 0.0,
      outlineColor = 0x000000,
      colorFunction = null
    } = options;

    const atlas = this.atlases.get(fontName);
    if (!atlas) {
      throw new Error(`Font "${fontName}" not loaded. Call loadFont() first.`);
    }

    const mesh = this._generateTextMesh(text, atlas, scale, {
      thickness,
      smoothness,
      outlineWidth,
      outlineColor: new THREE.Color(outlineColor),
      colorFunction
    });

    if (!mesh) {
      throw new Error('Failed to generate text mesh');
    }

    const id = this.nextId++;
    this.textMeshes.set(id, mesh);
    this.scene.add(mesh);

    return { id, mesh };
  }

  /**
   * Update existing text content
   * @param {number} id - Text mesh ID
   * @param {string} newText - New text content
   */
  updateText(id, newText) {
    const mesh = this.textMeshes.get(id);
    if (!mesh) {
      throw new Error(`Text mesh with id ${id} not found`);
    }

    // Get original settings from mesh userData
    const { fontName, scale, thickness, smoothness, outlineWidth, outlineColor, colorFunction } = mesh.userData;
    
    // Remove old mesh
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();

    // Create new mesh
    const atlas = this.atlases.get(fontName);
    const newMesh = this._generateTextMesh(newText, atlas, scale, {
      thickness,
      smoothness,
      outlineWidth,
      outlineColor,
      colorFunction
    });

    // Copy transform
    newMesh.position.copy(mesh.position);
    newMesh.rotation.copy(mesh.rotation);
    newMesh.scale.copy(mesh.scale);

    this.textMeshes.set(id, newMesh);
    this.scene.add(newMesh);

    return newMesh;
  }

  /**
   * Update rendering parameters
   * @param {number} id - Text mesh ID
   * @param {Object} params - Parameters to update
   * @param {number} [params.thickness] - Text thickness
   * @param {number} [params.smoothness] - Edge smoothness
   * @param {number} [params.outlineWidth] - Outline width
   * @param {THREE.Color|number} [params.outlineColor] - Outline color
   */
  updateParams(id, params) {
    const mesh = this.textMeshes.get(id);
    if (!mesh || !mesh.material.uniforms) return;

    const uniforms = mesh.material.uniforms;
    
    if (params.thickness !== undefined) {
      uniforms.thickness.value = params.thickness;
      mesh.userData.thickness = params.thickness;
    }
    if (params.smoothness !== undefined) {
      uniforms.smoothness.value = params.smoothness;
      mesh.userData.smoothness = params.smoothness;
    }
    if (params.outlineWidth !== undefined) {
      uniforms.outlineWidth.value = params.outlineWidth;
      mesh.userData.outlineWidth = params.outlineWidth;
    }
    if (params.outlineColor !== undefined) {
      uniforms.outlineColor.value = new THREE.Color(params.outlineColor);
      mesh.userData.outlineColor = new THREE.Color(params.outlineColor);
    }
  }

  /**
   * Remove a text mesh
   * @param {number} id - Text mesh ID
   */
  removeText(id) {
    const mesh = this.textMeshes.get(id);
    if (!mesh) return;

    this.scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    this.textMeshes.delete(id);
  }

  /**
   * Get text mesh by ID
   * @param {number} id - Text mesh ID
   * @returns {THREE.InstancedMesh|null}
   */
  getMesh(id) {
    return this.textMeshes.get(id) || null;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    // Dispose all text meshes
    for (const [id, mesh] of this.textMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.textMeshes.clear();

    // Dispose atlas textures
    for (const [fontName, atlas] of this.atlases) {
      atlas.texture.dispose();
    }
    this.atlases.clear();
  }

  /**
   * Internal method to generate instanced text mesh
   * @private
   */
  _generateTextMesh(text, atlas, scale, renderParams) {
    const { texture, data: atlasData } = atlas;
    
    // Build glyph lookup
    const glyphMap = new Map();
    const texW = atlasData.common.scaleW;
    const texH = atlasData.common.scaleH;
    
    for (const charData of atlasData.chars) {
      const char = String.fromCharCode(charData.id);
      glyphMap.set(char, charData);
    }
    
    const lines = text.split('\n');
    const fontSize = atlasData.info.size;
    const lineHeight = atlasData.common.lineHeight * scale;
    
    let totalChars = 0;
    for (const line of lines) {
      totalChars += line.length;
    }
    
    if (totalChars === 0) return null;
    
    // Create instanced geometry
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        msdfTexture: { value: texture },
        thickness: { value: renderParams.thickness },
        smoothness: { value: renderParams.smoothness },
        outlineWidth: { value: renderParams.outlineWidth },
        outlineColor: { value: renderParams.outlineColor }
      },
      vertexShader: msdfVertexShader,
      fragmentShader: msdfFragmentShader,
      transparent: true,
      depthTest: true
    });
    
    const mesh = new THREE.InstancedMesh(geometry, material, totalChars);
    
    // Store settings for updates
    mesh.userData = {
      fontName: Array.from(this.atlases.entries()).find(([name, a]) => a === atlas)?.[0],
      scale,
      ...renderParams
    };
    
    // Layout glyphs
    const dummy = new THREE.Object3D();
    const uvOffset = new Float32Array(totalChars * 4);
    const instanceColors = new Float32Array(totalChars * 3);
    
    let idx = 0;
    
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      
      // Calculate line width for centering
      let lineWidth = 0;
      for (const char of line) {
        const glyph = glyphMap.get(char);
        if (glyph) {
          lineWidth += glyph.xadvance * scale;
        } else {
          lineWidth += fontSize * scale * 0.3;
        }
      }
      
      let xOffset = -lineWidth / 2;
      const yOffset = (lines.length / 2 - lineIdx - 0.5) * lineHeight;
      
      for (const char of line) {
        const glyph = glyphMap.get(char);
        
        if (!glyph) {
          xOffset += fontSize * scale * 0.3;
          continue;
        }
        
        // Glyph dimensions
        const glyphWidth = glyph.width * scale;
        const glyphHeight = glyph.height * scale;
        
        // Position with offsets for proper baseline alignment
        const xPos = xOffset + glyph.xoffset * scale + glyphWidth / 2;
        const yPos = yOffset - (glyph.yoffset * scale) - glyphHeight / 2;
        
        dummy.position.set(xPos, yPos, 0);
        dummy.scale.set(glyphWidth, glyphHeight, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        
        // UV coordinates (BMFont uses top-left origin, WebGL uses bottom-left)
        uvOffset[idx * 4 + 0] = glyph.x / texW;
        uvOffset[idx * 4 + 1] = (glyph.y + glyph.height) / texH;
        uvOffset[idx * 4 + 2] = glyph.width / texW;
        uvOffset[idx * 4 + 3] = -glyph.height / texH;
        
        // Per-instance color
        let color;
        if (renderParams.colorFunction) {
          color = renderParams.colorFunction(idx, totalChars);
        } else {
          // Default: rainbow gradient
          const hue = (idx / totalChars) * 360;
          color = new THREE.Color().setHSL(hue / 360, 0.8, 0.6);
        }
        
        instanceColors[idx * 3 + 0] = color.r;
        instanceColors[idx * 3 + 1] = color.g;
        instanceColors[idx * 3 + 2] = color.b;
        
        xOffset += glyph.xadvance * scale;
        idx++;
      }
    }
    
    // Hide unused instances
    for (let i = idx; i < totalChars; i++) {
      dummy.position.set(0, 0, -1000);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      
      instanceColors[i * 3 + 0] = 1.0;
      instanceColors[i * 3 + 1] = 1.0;
      instanceColors[i * 3 + 2] = 1.0;
    }
    
    geometry.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(uvOffset, 4));
    geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(instanceColors, 3));
    mesh.instanceMatrix.needsUpdate = true;
    
    return mesh;
  }
}

// Export helper for creating rainbow gradient color function
export function rainbowGradient(index, total) {
  const hue = (index / total) * 360;
  return new THREE.Color().setHSL(hue / 360, 0.8, 0.6);
}

// Export helper for creating solid color function
export function solidColor(color) {
  const col = new THREE.Color(color);
  return () => col;
}

// Export helper for creating alternating color function
export function alternatingColors(...colors) {
  const cols = colors.map(c => new THREE.Color(c));
  return (index) => cols[index % cols.length];
}

