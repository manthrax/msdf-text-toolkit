/**
 * MSDF Shaders for Three.js
 * 
 * Vertex and fragment shaders for rendering Multi-channel Signed Distance Fields
 * with improved antialiasing using fractional derivatives.
 * 
 * @module shaders
 */

export const msdfVertexShader = `
  attribute vec4 uvOffset; // x, y = offset in atlas; z, w = width, height
  attribute vec4 instanceColor; // per-instance RGBA
  attribute vec4 instanceOutlineColor; // per-instance outline RGBA
  attribute vec2 instanceThickness; // [thickness, outlineThickness] multipliers
  
  varying vec2 vUv;
  varying vec4 vColor;
  varying vec4 vOutlineColor;
  varying vec2 vThickness;
  
  void main() {
    // Calculate UV coordinates for this glyph
    vUv = vec2(
      uvOffset.x + uv.x * uvOffset.z,
      uvOffset.y + uv.y * uvOffset.w
    );
    
    // Pass per-instance attributes to fragment shader
    vColor = instanceColor;
    vOutlineColor = instanceOutlineColor;
    vThickness = instanceThickness;
    
    // Standard Three.js transformation pipeline
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

export const msdfFragmentShader = `
  uniform sampler2D msdfTexture;
  uniform vec3 globalColor;            // Global color (multiplied with instance)
  uniform vec3 globalOutlineColor;     // Global outline color
  uniform float globalThickness;       // Global thickness
  uniform float globalOutlineThickness; // Global outline thickness
  uniform float globalSmoothness;      // Global smoothness
  
  varying vec2 vUv;
  varying vec4 vColor;         // Per-instance color RGBA
  varying vec4 vOutlineColor;  // Per-instance outline RGBA
  varying vec2 vThickness;     // Per-instance [thickness, outlineThickness] multipliers

  float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
  }

  void main() {
    // Sample MSDF texture
    vec3 msd = texture2D(msdfTexture, vUv).rgb;
    float sd = median(msd.r, msd.g, msd.b);
    
    // Improved antialiasing using fractional derivatives from MSDF
    vec2 Jdx = dFdx(msd.rg);
    vec2 Jdy = dFdy(msd.rg);
    float pixelDist = sqrt(dot(Jdx, Jdx) + dot(Jdy, Jdy));
    float w = max(pixelDist, 0.0001); // Avoid division by zero
    
    // Hybrid control: multiply global × instance
    float finalThickness = globalThickness * vThickness.x;
    float finalOutlineThickness = globalOutlineThickness * vThickness.y;
    
    // Inner edge (fill boundary)
    float innerEdge = finalThickness;
    float innerDist = (sd - innerEdge) / w;
    float innerAlpha = clamp(innerDist + 0.5, 0.0, 1.0);
    innerAlpha = smoothstep(0.5 - globalSmoothness, 0.5 + globalSmoothness, innerAlpha);
    
    // Outer edge (outline boundary)
    float outerEdge = finalThickness - finalOutlineThickness;
    float outerDist = (sd - outerEdge) / w;
    float outerAlpha = clamp(outerDist + 0.5, 0.0, 1.0);
    outerAlpha = smoothstep(0.5 - globalSmoothness, 0.5 + globalSmoothness, outerAlpha);
    
    // Outline mask: area between outer and inner edges
    float outlineMask = outerAlpha * (1.0 - innerAlpha);
    
    // Hybrid color: multiply global × instance (component-wise)
    vec3 fillColor = globalColor * vColor.rgb;
    vec3 outlineColorFinal = globalOutlineColor * vOutlineColor.rgb;
    
    // Blend fill color with outline color
    vec3 finalColor = mix(fillColor, outlineColorFinal, outlineMask);
    
    // Hybrid alpha: multiply global opacity × instance alpha
    float finalAlpha = outerAlpha * vColor.a;
    
    if (finalAlpha < 0.01) discard;
    
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

