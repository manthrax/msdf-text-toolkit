/**
 * Matrix Rain Effect for MSDF Text
 * 
 * Reusable matrix-style falling text animation
 * Compatible with MSDFString instances
 */

import * as THREE from 'three';

export class MatrixRain {
  /**
   * Create a matrix rain effect
   * @param {MSDFString} textMesh - The text mesh to animate
   * @param {Object} options - Configuration options
   */
  constructor(textMesh, options = {}) {
    const {
      columns = 300,
      charsPerColumn = 45,
      spacing = 0.4,
      charSize = 0.12,
      speedMin = 0.02,
      speedMax = 0.08,
      viewHeight = 10,
      densityFactor = 1.0
    } = options;

    this.textMesh = textMesh;
    this.columns = [];
    this.densityFactor = densityFactor;
    this.active = true;

    // Get font data for glyph mapping
    const fontName = typeof textMesh.font === 'string' ? textMesh.font : null;
    let fontData;
    
    if (fontName) {
      // Font loaded by name
      const MSDFString = textMesh.constructor;
      fontData = MSDFString.getFont(fontName);
    } else {
      // Font object passed directly
      fontData = textMesh.font;
    }

    if (!fontData) {
      throw new Error('MatrixRain: Could not get font data from text mesh');
    }

    // Build glyph map
    this.glyphMap = new Map();
    for (const charData of fontData.data.chars) {
      this.glyphMap.set(String.fromCharCode(charData.id), charData);
    }
    this.glyphArray = Array.from(this.glyphMap.keys()).filter(c => c.trim() !== '');

    this.texW = fontData.data.common.scaleW;
    this.texH = fontData.data.common.scaleH;
    this.scale = 0.01;
    this.charSize = charSize;
    this.viewHeight = viewHeight;

    // Create columns in 3D space
    const gridSize = Math.ceil(Math.sqrt(columns));
    const gridWidth = gridSize * spacing;
    let instanceIndex = 0;

    for (let col = 0; col < columns; col++) {
      const gridX = (col % gridSize) - gridSize / 2;
      const gridZ = Math.floor(col / gridSize) - gridSize / 2;

      const column = {
        x: gridX * spacing,
        z: gridZ * spacing,
        y: Math.random() * viewHeight + viewHeight,
        speed: speedMin + Math.random() * (speedMax - speedMin),
        instanceIndices: []
      };

      // Assign instances to this column
      for (let i = 0; i < charsPerColumn && instanceIndex < textMesh.capacity; i++) {
        column.instanceIndices.push(instanceIndex++);
      }

      this.columns.push(column);
    }

    // Initialize all instances with random characters
    this._initializeInstances();
  }

  /**
   * Initialize all instances with random characters
   * @private
   */
  _initializeInstances() {
    const geometry = this.textMesh.geometry;
    const uvOffset = geometry.attributes.uvOffset.array;
    const dummy = new THREE.Object3D();

    for (const column of this.columns) {
      for (let i = 0; i < column.instanceIndices.length; i++) {
        const idx = column.instanceIndices[i];
        const charY = column.y - (i * this.charSize * 0.85);

        // Set position
        dummy.position.set(column.x, charY, column.z);
        dummy.scale.set(this.charSize, this.charSize, 1);
        dummy.updateMatrix();
        this.textMesh.setMatrixAt(idx, dummy.matrix);

        // Set random character
        const char = this.glyphArray[Math.floor(Math.random() * this.glyphArray.length)];
        const glyph = this.glyphMap.get(char);
        if (glyph) {
          uvOffset[idx * 4 + 0] = glyph.x / this.texW;
          uvOffset[idx * 4 + 1] = (glyph.y + glyph.height) / this.texH;
          uvOffset[idx * 4 + 2] = glyph.width / this.texW;
          uvOffset[idx * 4 + 3] = -glyph.height / this.texH;
        }
      }
    }

    this.textMesh.instanceMatrix.needsUpdate = true;
    geometry.attributes.uvOffset.needsUpdate = true;
  }

  /**
   * Update the animation (call this in your animation loop)
   */
  update() {
    if (!this.active) return;

    const dummy = new THREE.Object3D();
    const geometry = this.textMesh.geometry;
    const uvOffset = geometry.attributes.uvOffset.array;
    const colors = geometry.attributes.instanceColor.array;
    const glowModes = geometry.attributes.instanceGlowMode.array;
    const outlineColors = geometry.attributes.instanceOutlineColor.array;

    for (const column of this.columns) {
      column.y -= column.speed * this.densityFactor;

      // Reset column when it goes off screen
      if (column.y < -this.viewHeight) {
        column.y = this.viewHeight + Math.random() * 5;
        column.speed = 0.02 + Math.random() * 0.06;
      }

      // Update each character in the column
      for (let i = 0; i < column.instanceIndices.length; i++) {
        const idx = column.instanceIndices[i];
        const charY = column.y - (i * this.charSize * 0.85);

        // Update position
        dummy.position.set(column.x, charY, column.z);
        dummy.scale.set(this.charSize, this.charSize, 1);
        dummy.updateMatrix();
        this.textMesh.setMatrixAt(idx, dummy.matrix);

        // Randomly change character
        if (Math.random() > 0.98) {
          const char = this.glyphArray[
            Math.floor(Math.random() * this.glyphArray.length)
          ];
          const glyph = this.glyphMap.get(char);
          if (glyph) {
            uvOffset[idx * 4 + 0] = glyph.x / this.texW;
            uvOffset[idx * 4 + 1] = (glyph.y + glyph.height) / this.texH;
            uvOffset[idx * 4 + 2] = glyph.width / this.texW;
            uvOffset[idx * 4 + 3] = -glyph.height / this.texH;
          }
        }

        // Update color (fade from bright to dark)
        const fadePosition = i / column.instanceIndices.length;
        const brightness = 0.3 + fadePosition * 0.7;
        colors[idx * 4 + 0] = brightness * 0.15;
        colors[idx * 4 + 1] = brightness * 0.9;
        colors[idx * 4 + 2] = brightness * 0.2;
        colors[idx * 4 + 3] = 1.0;
        
        // Update glow intensity based on brightness
        // Brighter characters = more glow (1.0), dimmer = less glow
        glowModes[idx] = brightness;
        
        // Update outline color alpha based on brightness
        // This creates a nice fading glow effect
        outlineColors[idx * 4 + 0] = brightness * 0.2;  // R
        outlineColors[idx * 4 + 1] = brightness * 1.0;  // G (bright green)
        outlineColors[idx * 4 + 2] = brightness * 0.3;  // B
        outlineColors[idx * 4 + 3] = brightness;         // A (fade with brightness)
      }
    }

    this.textMesh.instanceMatrix.needsUpdate = true;
    geometry.attributes.uvOffset.needsUpdate = true;
    geometry.attributes.instanceColor.needsUpdate = true;
    geometry.attributes.instanceGlowMode.needsUpdate = true;
    geometry.attributes.instanceOutlineColor.needsUpdate = true;
  }

  /**
   * Set animation density (speed multiplier)
   * @param {number} density - 0.0 to 1.0+
   */
  setDensity(density) {
    this.densityFactor = density;
  }

  /**
   * Start the animation
   */
  start() {
    this.active = true;
  }

  /**
   * Stop the animation
   */
  stop() {
    this.active = false;
  }

  /**
   * Dispose of resources
   */
  dispose() {
    this.active = false;
    this.columns = [];
    this.glyphMap.clear();
  }
}

