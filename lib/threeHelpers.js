/**
 * Shared Three.js utilities for MSDF Text Toolkit
 * Provides common setup and helpers used across examples and generator
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Initialize a standard Three.js scene with camera, renderer, and controls
 * @param {HTMLElement|string} container - Container element or selector
 * @param {Object} options - Configuration options
 * @returns {Object} - {scene, camera, renderer, controls}
 */
export function initThreeScene(container, options = {}) {
  const {
    bgColor = 0x0b0b0b,
    cameraFov = 75,
    cameraNear = 0.1,
    cameraFar = 1000,
    cameraPosition = { x: 0, y: 0, z: 5 },
    enableControls = true,
    controlsDamping = true,
    dampingFactor = 0.05
  } = options;

  // Get container element
  const containerEl = typeof container === 'string' 
    ? document.querySelector(container) 
    : container;

  if (!containerEl) {
    throw new Error('Container element not found');
  }

  // Helper to get dimensions (fallback to window for body/html)
  const isBodyOrHtml = containerEl === document.body || containerEl === document.documentElement;
  const getWidth = () => isBodyOrHtml ? window.innerWidth : containerEl.clientWidth;
  const getHeight = () => isBodyOrHtml ? window.innerHeight : containerEl.clientHeight;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bgColor);

  // Camera
  const width = getWidth();
  const height = getHeight();
  const camera = new THREE.PerspectiveCamera(
    cameraFov,
    width / height,
    cameraNear,
    cameraFar
  );
  camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  containerEl.appendChild(renderer.domElement);

  // Controls
  let controls = null;
  if (enableControls) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = controlsDamping;
    controls.dampingFactor = dampingFactor;
  }

  // Auto-handle window resize
  const resizeHandler = () => {
    const w = getWidth();
    const h = getHeight();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', resizeHandler, false);

  return {
    scene,
    camera,
    renderer,
    controls,
    resizeHandler, // Export so it can be removed if needed
    dispose: () => {
      window.removeEventListener('resize', resizeHandler);
      renderer.dispose();
      if (controls) controls.dispose();
    }
  };
}

/**
 * Create a standard animation loop
 * @param {Function} callback - Function to call each frame (receives {scene, camera, renderer, controls})
 * @param {Object} context - Context object with scene, camera, renderer, controls
 * @returns {Function} - Stop function to halt the animation loop
 */
export function createAnimationLoop(callback, context) {
  let animationId = null;
  let stopped = false;

  function animate() {
    if (stopped) return;
    animationId = requestAnimationFrame(animate);
    
    if (context.controls) {
      context.controls.update();
    }
    
    callback(context);
    
    context.renderer.render(context.scene, context.camera);
  }

  animate();

  return () => {
    stopped = true;
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
}

/**
 * Setup basic raycasting for instanced meshes
 * @param {THREE.Camera} camera - Camera to raycast from
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Function} onIntersect - Callback (instanceId, intersect) when intersection occurs
 * @param {Object} options - {objects: array of meshes to test, dragThreshold: 200}
 */
export function setupRaycasting(camera, canvas, onIntersect, options = {}) {
  const { objects = [], dragThreshold = 200 } = options;
  
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let mouseDownTime = 0;

  const handleMouseDown = () => {
    mouseDownTime = Date.now();
  };

  const handleClick = (event) => {
    // Don't select if this was a drag
    if (Date.now() - mouseDownTime > dragThreshold) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    for (const obj of objects) {
      const intersects = raycaster.intersectObject(obj, true);
      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        onIntersect(instanceId, intersects[0]);
        return;
      }
    }
  };

  canvas.addEventListener('mousedown', handleMouseDown, false);
  canvas.addEventListener('click', handleClick, false);

  return {
    raycaster,
    mouse,
    dispose: () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('click', handleClick);
    }
  };
}


