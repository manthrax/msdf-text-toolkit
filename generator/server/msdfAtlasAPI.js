/**
 * MSDF Atlas Generator API
 * Programmatic interface to msdf-bmfont-xml
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, unlink } from 'fs/promises';
import { basename, extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Default charset (ASCII printable)
 */
export const DEFAULT_CHARSET = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

/**
 * Generate MSDF or MTSDF atlas from a font file
 * 
 * @param {Object} options - Generation options
 * @param {string} options.fontPath - Path to font file (.ttf, .otf, .woff)
 * @param {string} [options.outputName] - Output base name (default: font name)
 * @param {string} [options.charset] - Characters to include (default: ASCII printable)
 * @param {number} [options.fontSize] - Font size in pixels (default: 42)
 * @param {number} [options.textureWidth] - Atlas width (default: 1024)
 * @param {number} [options.textureHeight] - Atlas height (default: 1024)
 * @param {number} [options.distanceRange] - Pixel range for SDF (default: 4)
 * @param {string} [options.fieldType] - 'msdf', 'sdf', or 'psdf' (default: 'msdf')
 * @param {string} [options.outputFormat] - 'json' or 'xml' (default: 'json')
 * @param {boolean} [options.smart] - Smart sizing (default: true)
 * @param {boolean} [options.pot] - Power-of-two atlas size (default: false)
 * @param {boolean} [options.square] - Square atlas (default: false)
 * @param {number} [options.border] - Glyph border padding (default: 2)
 * @param {number} [options.spacing] - Glyph spacing (default: 1)
 * 
 * @returns {Promise<Object>} Result object with texture and metrics
 */
export async function generateAtlas(options) {
  const {
    fontPath,
    outputName = basename(fontPath, extname(fontPath)),
    charset = DEFAULT_CHARSET,
    fontSize = 42,
    textureWidth = 1024,
    textureHeight = 1024,
    distanceRange = 4,
    fieldType = 'msdf',
    outputFormat = 'json',
    smart = true,
    pot = false,
    square = false,
    border = 2,
    spacing = 1
  } = options;

  console.log(`[MSDF API] Generating ${fieldType.toUpperCase()} atlas from: ${fontPath}`);
  console.log(`[MSDF API] Font size: ${fontSize}px, Atlas: ${textureWidth}x${textureHeight}`);
  console.log(`[MSDF API] Distance range: ${distanceRange}, Charset: ${charset.length} characters`);

  const bmfontOptions = {
    outputType: outputFormat, // 'json' or 'xml'
    filename: outputName,
    charset: charset,
    fontSize: fontSize,
    textureWidth: textureWidth,
    textureHeight: textureHeight,
    distanceRange: distanceRange,
    fieldType: fieldType, // 'msdf', 'mtsdf', 'sdf'
    smartSize: smart,
    pot: pot,
    square: square,
    border: border,
    spacing: spacing,
    roundDecimal: 3
  };

  try {
    // Build command line arguments for msdf-bmfont CLI
    const args = [
      '-f', outputFormat,
      '-m', `${textureWidth},${textureHeight}`,
      '-p', spacing.toString(),
      '-r', distanceRange.toString(),
      '-t', fieldType,
      '-o', `${outputName}.png`,
      fontPath
    ];
    
    if (fontSize) {
      args.push('-s', fontSize.toString());
    }
    
    if (charset) {
      // Write charset to a temp file
      const charsetFile = `${outputName}-charset.txt`;
      await writeFile(charsetFile, charset);
      args.push('-i', charsetFile);
    }
    
    console.log(`[MSDF API] Running: npx msdf-bmfont`, args.join(' '));
    
    // Run the CLI command - use shell on Windows to find npx.cmd
    const { stdout, stderr } = await execFileAsync('npx', ['msdf-bmfont', ...args], {
      cwd: __dirname,
      shell: true  // Required on Windows to find npx.cmd
    });
    
    console.log(`[MSDF API] CLI output:`, stdout);
    if (stderr) console.error(`[MSDF API] CLI stderr:`, stderr);
    
    // The CLI writes files named after the font file basename
    const fontBasename = basename(fontPath, extname(fontPath));
    const jsonFilePath = `${fontBasename}.json`;
    const pngFilePath = `${outputName}.png`;
    
    console.log(`[MSDF API] Reading generated files: PNG=${pngFilePath}, JSON=${jsonFilePath}`);
    
    // Read the generated files
    const [pngBuffer, jsonContent] = await Promise.all([
      readFile(pngFilePath),
      readFile(jsonFilePath, 'utf8')
    ]);
    
    const jsonData = JSON.parse(jsonContent);
    console.log(`[MSDF API] Generated successfully with ${jsonData.chars?.length || 0} chars`);
    
    // Clean up charset file if we created one
    if (charset) {
      await unlink(`${outputName}-charset.txt`).catch(() => {});
    }
    
    return {
      success: true,
      outputName,
      outputFormat,
      texture: pngBuffer, // PNG Buffer
      data: jsonData, // Metadata object
      jsonFile: jsonFilePath, // For cleanup
      pngFile: pngFilePath // For cleanup
    };
  } catch (error) {
    console.error(`[MSDF API] Generation failed:`, error);
    throw error;
  }
}

/**
 * Generate and save atlas files to disk
 * msdf-bmfont-xml writes files directly, so this just returns the paths
 * 
 * @param {Object} options - Same as generateAtlas, plus:
 * @param {string} [options.outputDir] - Output directory (default: current dir)
 * 
 * @returns {Promise<Object>} Paths to generated files
 */
export async function generateAndSave(options) {
  const { 
    outputDir = '.',
    outputName = basename(options.fontPath, extname(options.fontPath)),
    outputFormat = 'json'
  } = options;
  
  const result = await generateAtlas(options);
  
  const files = {
    textures: [`${outputName}.png`],
    data: `${outputName}.${outputFormat}`
  };
  
  console.log(`[MSDF API] Files generated:`);
  console.log(`[MSDF API] - Texture: ${files.textures[0]}`);
  console.log(`[MSDF API] - Data: ${files.data}`);
  
  return files;
}

/**
 * Quick generate with minimal options
 * 
 * @param {string} fontPath - Path to font file
 * @param {Object} [options] - Optional overrides
 * @returns {Promise<Object>} Generated files
 */
export async function quickGenerate(fontPath, options = {}) {
  return generateAndSave({
    fontPath,
    ...options
  });
}

/**
 * Generate high-quality MSDF atlas
 * 
 * @param {string} fontPath - Path to font file
 * @param {Object} [options] - Optional overrides
 * @returns {Promise<Object>} Generated files
 */
export async function generateMTSDF(fontPath, options = {}) {
  return generateAndSave({
    fontPath,
    fieldType: 'msdf',
    fontSize: 48,
    distanceRange: 6,
    ...options
  });
}

/**
 * Generate production-ready atlas (large, high quality)
 * 
 * @param {string} fontPath - Path to font file
 * @param {Object} [options] - Optional overrides
 * @returns {Promise<Object>} Generated files
 */
export async function generateProduction(fontPath, options = {}) {
  return generateAndSave({
    fontPath,
    fieldType: 'msdf',
    fontSize: 48,
    textureWidth: 2048,
    textureHeight: 2048,
    distanceRange: 6,
    border: 3,
    spacing: 2,
    ...options
  });
}

/**
 * Batch generate atlases for multiple fonts
 * 
 * @param {string[]} fontPaths - Array of font file paths
 * @param {Object} [options] - Options to apply to all
 * @returns {Promise<Object[]>} Array of results
 */
export async function generateBatch(fontPaths, options = {}) {
  const results = [];
  
  for (const fontPath of fontPaths) {
    console.log(`\n[MSDF API] Processing ${fontPath}...`);
    try {
      const result = await generateAndSave({
        fontPath,
        ...options
      });
      results.push({ fontPath, success: true, ...result });
    } catch (error) {
      console.error(`[MSDF API] Failed ${fontPath}:`, error.message);
      results.push({ fontPath, success: false, error: error.message });
    }
  }
  
  return results;
}

