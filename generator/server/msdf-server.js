/**
 * MSDF Generator Server
 * Backend API for browser-based MSDF atlas generation using native tools
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { readFile, writeFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateAtlas } from './msdfAtlasAPI.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3001;

// Configure multer for font file uploads
const upload = multer({
  dest: 'temp-uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.ttf', '.otf', '.woff', '.woff2'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only font files (.ttf, .otf, .woff, .woff2) are allowed'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the UI directory (absolute path)
const uiPath = join(__dirname, '../ui');
const fontsPath = join(__dirname, '../fonts');
const atlasesPath = join(__dirname, '../../atlases');
const examplesPath = join(__dirname, '../../examples');
const libPath = join(__dirname, '../../lib');

app.use(express.static(uiPath));

// Serve fonts directory
app.use('/fonts', express.static(fontsPath));

// Serve atlases directory
app.use('/atlases', express.static(atlasesPath));

// Serve examples directory
app.use('/examples', express.static(examplesPath));

// Serve lib directory (for MSDFString, shaders, etc.)
app.use('/lib', express.static(libPath));

// Serve index.html as the default root page
app.get('/', (req, res) => {
  res.sendFile(join(uiPath, 'index.html'));
});

// API: Generate MSDF atlas
app.post('/api/generate', upload.single('font'), async (req, res) => {
  let tempFontPath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No font file provided' });
    }
    
    tempFontPath = req.file.path;
    const options = JSON.parse(req.body.options || '{}');
    
    console.log('[Server] Generating atlas for:', req.file.originalname);
    console.log('[Server] Options:', options);
    
    // Set output name to temp file to avoid conflicts
    const outputName = `temp-${Date.now()}`;
    
    // Generate atlas - this returns the data in memory
    const result = await generateAtlas({
      fontPath: tempFontPath,
      outputName,
      charset: options.charset || undefined,
      fontSize: parseInt(options.fontSize) || 42,
      textureWidth: parseInt(options.textureWidth) || 1024,
      textureHeight: parseInt(options.textureHeight) || 1024,
      distanceRange: parseFloat(options.distanceRange) || 4,
      fieldType: options.fieldType || 'msdf',
      outputFormat: 'json'
    });
    
    console.log(`[Server] Generation complete! Texture size: ${result.texture?.length || 0} bytes`);
    
    // Return atlas data and texture
    res.json({
      success: true,
      atlas: result.data,
      texture: `data:image/png;base64,${result.texture.toString('base64')}`
    });
    
    // Clean up temp files after sending response
    const cleanupPromises = [];
    if (tempFontPath) {
      cleanupPromises.push(unlink(tempFontPath));
    }
    if (result.jsonFile) {
      cleanupPromises.push(unlink(result.jsonFile));
    }
    if (result.pngFile) {
      cleanupPromises.push(unlink(result.pngFile));
    }
    
    if (cleanupPromises.length > 0) {
      Promise.all(cleanupPromises).catch(err => console.warn('[Server] Cleanup warning:', err.message));
    }
    
  } catch (error) {
    console.error('[Server] Generation error:', error);
    
    // Clean up on error
    if (tempFontPath) {
      await unlink(tempFontPath).catch(err => console.warn('[Server] Error cleanup:', err.message));
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: List available fonts
app.get('/api/fonts', async (req, res) => {
  try {
    const { readdir } = await import('fs/promises');
    const fontsPath = join(__dirname, '../fonts');
    const files = await readdir(fontsPath);
    const fonts = files.filter(f => 
      f.endsWith('.ttf') || 
      f.endsWith('.otf') || 
      f.endsWith('.woff') || 
      f.endsWith('.woff2')
    );
    res.json({ fonts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(70));
  console.log('  MSDF Generator Server');
  console.log('='.repeat(70));
  console.log('');
  console.log(`  🚀 Server running at: http://localhost:${PORT}`);
  console.log(`  📁 Serving UI from: ${uiPath}`);
  console.log(`  📦 Fonts from: ${fontsPath}`);
  console.log(`  💾 Atlases from: ${atlasesPath}`);
  console.log(`  🎬 Examples from: ${examplesPath}`);
  console.log('');
  console.log('  Open http://localhost:3001 in your browser');
  console.log('');
  console.log('='.repeat(70));
});

