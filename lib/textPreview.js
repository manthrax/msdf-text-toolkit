/**
 * Text Preview Helpers for MSDF Text Toolkit
 * 
 * Reusable utilities for creating demo text meshes
 * Used by examples and generator
 */

import * as THREE from 'three';

/**
 * Apply a rainbow gradient to a text mesh
 * @param {MSDFString} textMesh - The text mesh to colorize
 */
export function applyRainbowGradient(textMesh) {
  const length = textMesh.getLength();
  for (let i = 0; i < length; i++) {
    const hue = (i / length) * 360;
    const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.6);
    textMesh.setCharacterColor(i, color, 1.0);
  }
}

/**
 * Apply a color gradient between two colors
 * @param {MSDFString} textMesh - The text mesh to colorize
 * @param {string|THREE.Color} startColor - Start color
 * @param {string|THREE.Color} endColor - End color
 */
export function applyGradient(textMesh, startColor, endColor) {
  const start = new THREE.Color(startColor);
  const end = new THREE.Color(endColor);
  const length = textMesh.getLength();
  
  for (let i = 0; i < length; i++) {
    const t = i / Math.max(1, length - 1);
    const color = new THREE.Color().lerpColors(start, end, t);
    textMesh.setCharacterColor(i, color, 1.0);
  }
}

/**
 * Create a simple text preview with common defaults
 * @param {string} fontName - Font name (must be loaded)
 * @param {string} text - Text to display
 * @param {Object} options - Additional options
 * @returns {MSDFString}
 */
export function createTextPreview(fontName, text, options = {}) {
  const {
    color = '#ffffff',
    outlineColor = '#000000',
    thickness = 0.5,
    outlineThickness = 0.05,
    fontSize = 0.015,
    align = 'center',
    enableGlow = false,
    applyRainbow = false
  } = options;

  // Get MSDFString constructor
  // This is a bit hacky but works since we're in the same module ecosystem
  const MSDFString = window.MSDFString || options.MSDFString;
  
  if (!MSDFString) {
    throw new Error('MSDFString not available. Make sure it\'s imported.');
  }

  const textMesh = new MSDFString({
    font: fontName,
    text: text,
    color: color,
    outlineColor: outlineColor,
    thickness: thickness,
    outlineThickness: outlineThickness,
    fontSize: fontSize,
    align: align
  });

  if (enableGlow) {
    textMesh.enableGlow();
  }

  if (applyRainbow) {
    applyRainbowGradient(textMesh);
  }

  return textMesh;
}

/**
 * Create animated pulsing effect on text
 * @param {MSDFString} textMesh - The text mesh to animate
 * @param {Object} options - Animation options
 * @returns {Function} - Animation update function
 */
export function createPulseAnimation(textMesh, options = {}) {
  const {
    speed = 2.0,
    minThickness = 0.4,
    maxThickness = 0.6
  } = options;

  let time = 0;

  return (delta) => {
    time += delta * speed;
    const thickness = minThickness + (maxThickness - minThickness) * (Math.sin(time) * 0.5 + 0.5);
    textMesh.setGlobalThickness(thickness);
  };
}

/**
 * Create wave animation on text
 * @param {MSDFString} textMesh - The text mesh to animate
 * @param {Object} options - Animation options
 * @returns {Function} - Animation update function
 */
export function createWaveAnimation(textMesh, options = {}) {
  const {
    speed = 2.0,
    amplitude = 0.2,
    frequency = 0.5
  } = options;

  let time = 0;

  return (delta) => {
    time += delta * speed;
    const length = textMesh.getLength();
    
    for (let i = 0; i < length; i++) {
      const offset = Math.sin(time + i * frequency) * amplitude;
      const pos = new THREE.Vector3(0, offset, 0);
      
      const matrix = new THREE.Matrix4();
      matrix.makeTranslation(pos.x, pos.y, pos.z);
      
      // This would need to be combined with existing transform
      // For now, just update y position in a simple way
      const brightness = 0.5 + Math.sin(time + i * frequency) * 0.5;
      const color = new THREE.Color().setHSL(brightness, 0.8, 0.6);
      textMesh.setCharacterColor(i, color, 1.0);
    }
  };
}

/**
 * Create a typewriter effect
 * @param {MSDFString} textMesh - The text mesh
 * @param {string} fullText - The full text to type
 * @param {Object} options - Animation options
 * @returns {Object} - {update, reset, isComplete}
 */
export function createTypewriterEffect(textMesh, fullText, options = {}) {
  const {
    speed = 10, // characters per second
    cursor = true,
    cursorBlink = true,
    blinkSpeed = 2.0
  } = options;

  let currentLength = 0;
  let time = 0;
  let blinkTime = 0;
  let complete = false;

  const update = (delta) => {
    if (complete) return;

    time += delta;
    const targetLength = Math.min(Math.floor(time * speed), fullText.length);

    if (targetLength > currentLength) {
      currentLength = targetLength;
      const displayText = fullText.substring(0, currentLength);
      textMesh.setText(cursor ? displayText + '|' : displayText);

      if (currentLength >= fullText.length) {
        complete = true;
      }
    }

    if (cursor && cursorBlink && !complete) {
      blinkTime += delta * blinkSpeed;
      const visible = Math.floor(blinkTime) % 2 === 0;
      // Toggle cursor visibility (would need cursor character support)
    }
  };

  const reset = () => {
    currentLength = 0;
    time = 0;
    complete = false;
    textMesh.setText('');
  };

  const isComplete = () => complete;

  return { update, reset, isComplete };
}

