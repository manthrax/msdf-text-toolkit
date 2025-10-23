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
  attribute float instanceGlowMode; // 0.0 = hard outline, 1.0 = glow/shadow
  
  varying vec2 vUv;
  varying vec4 vColor;
  varying vec4 vOutlineColor;
  varying vec2 vThickness;
  varying float vGlowMode;
  
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
    vGlowMode = instanceGlowMode;
    
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
  uniform float globalGlowMode;        // Global glow mode (0.0 = hard, 1.0 = glow)
  
  varying vec2 vUv;
  varying vec4 vColor;         // Per-instance color RGBA
  varying vec4 vOutlineColor;  // Per-instance outline RGBA
  varying vec2 vThickness;     // Per-instance [thickness, outlineThickness] multipliers
  varying float vGlowMode;     // Per-instance glow mode

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
    float finalGlowMode = 1.;// globalGlowMode * vGlowMode;
    
    // Inner edge (fill boundary)
    float innerEdge = finalThickness;
    float innerDist = (sd - innerEdge) / w;
    float innerAlpha = clamp(innerDist + 0.5, 0.0, 1.0);
    innerAlpha = smoothstep(0.5 - globalSmoothness, 0.5 + globalSmoothness, innerAlpha);
    
    // Outer edge (outline/glow boundary)
    float outerEdge = finalThickness - finalOutlineThickness;
    float outerDist = (sd - outerEdge) / w;
    float outerAlpha = clamp(outerDist + 0.5, 0.0, 1.0);
    outerAlpha = smoothstep(0.5 - globalSmoothness, 0.5 + globalSmoothness, outerAlpha);
    
    // Hybrid color: multiply global × instance (component-wise)
    vec3 fillColor = globalColor * vColor.rgb;
    vec3 outlineColorFinal = globalOutlineColor * vOutlineColor.rgb;
    
    vec3 finalColor;
    float finalAlpha;
    
    // Choose between hard outline mode and glow mode
    if (finalGlowMode > 0.5) {
      // GLOW MODE: Soft fade with outline color
      // The glow should be visible and fade smoothly to transparent
      
      // In the glow region (between inner and outer edge), we want:
      // - Full glow color visibility
      // - Smooth alpha fade from solid to transparent
      
      // Calculate distance from inner edge (0.0 = at inner edge, 1.0 = at outer edge)
      float glowRegion = 1.0 - innerAlpha; // 0.0 inside fill, 1.0 at inner edge
      float glowFade = outerAlpha; // Fades from 1.0 to 0.0 toward outer edge
      
      // Inside the fill: use fill color
      // In glow region: use glow color with fade
      if (innerAlpha > 0.5) {
        // Inside the solid fill area
        finalColor = fillColor;
        finalAlpha = 1.0 * vColor.a;
      } else {
        // In the glow region
        finalColor = outlineColorFinal;
        // Fade alpha smoothly from inner to outer edge
        float edgeDist = (sd - outerEdge) / (innerEdge - outerEdge);
        // Make the fade more dramatic with a power curve
        float fadeAmount = smoothstep(0.0, 1.0, edgeDist);
        fadeAmount = fadeAmount * fadeAmount; // Square it for more dramatic falloff
        finalAlpha = fadeAmount * vColor.a;
      }
      
    } else {
      // HARD OUTLINE MODE: Traditional sharp outline
      // Outline mask: area between outer and inner edges
      float outlineMask = outerAlpha * (1.0 - innerAlpha);
      
      // Blend fill color with outline color
      finalColor = mix(fillColor, outlineColorFinal, outlineMask);
      
      // Hybrid alpha: multiply global opacity × instance alpha
      finalAlpha = outerAlpha * vColor.a;
    }
    
    if (finalAlpha < 0.01) discard;
    
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

