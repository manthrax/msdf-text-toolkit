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
  attribute vec3 instanceColor; // per-instance color
  
  varying vec2 vUv;
  varying vec3 vColor;
  
  void main() {
    // Calculate UV coordinates for this glyph
    vUv = vec2(
      uvOffset.x + uv.x * uvOffset.z,
      uvOffset.y + uv.y * uvOffset.w
    );
    
    // Pass per-instance color to fragment shader
    vColor = instanceColor;
    
    // Standard Three.js transformation pipeline
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

export const msdfFragmentShader = `
  uniform sampler2D msdfTexture;
  uniform float thickness;
  uniform float smoothness;
  uniform float outlineWidth;
  uniform vec3 outlineColor;
  
  varying vec2 vUv;
  varying vec3 vColor;

  float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
  }

  void main() {
    // Sample MSDF texture
    vec3 msd = texture2D(msdfTexture, vUv).rgb;
    float sd = median(msd.r, msd.g, msd.b);
    
    // Improved antialiasing using fractional derivatives from MSDF
    // Use the spread of RGB channels to estimate anisotropic filtering
    vec2 Jdx = dFdx(msd.rg);
    vec2 Jdy = dFdy(msd.rg);
    float pixelDist = sqrt(dot(Jdx, Jdx) + dot(Jdy, Jdy));
    float w = max(pixelDist, 0.0001); // Avoid division by zero
    
    // Calculate signed distance in screen pixels
    float screenPxDistance = (sd - 0.5) / w;
    
    // Inner edge (fill boundary)
    float innerEdge = thickness;
    float innerDist = (sd - innerEdge) / w;
    float innerAlpha = clamp(innerDist + 0.5, 0.0, 1.0);
    innerAlpha = smoothstep(0.5 - smoothness, 0.5 + smoothness, innerAlpha);
    
    // Outer edge (outline boundary)
    float outerEdge = thickness - outlineWidth;
    float outerDist = (sd - outerEdge) / w;
    float outerAlpha = clamp(outerDist + 0.5, 0.0, 1.0);
    outerAlpha = smoothstep(0.5 - smoothness, 0.5 + smoothness, outerAlpha);
    
    // Outline mask: area between outer and inner edges
    float outlineMask = outerAlpha * (1.0 - innerAlpha);
    
    // Blend fill color with outline color
    vec3 finalColor = mix(vColor, outlineColor, outlineMask);
    float finalAlpha = outerAlpha;
    
    if (finalAlpha < 0.01) discard;
    
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

