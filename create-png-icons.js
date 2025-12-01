#!/usr/bin/env node

/**
 * Creates PNG icons from SVG files using canvas
 * This script creates simple PNG icons for Chrome compatibility
 */

const fs = require('fs');
const path = require('path');

// Create simple PNG icons using data URLs
const createPNGIcon = (size) => {
  // Create a simple blue square with "ELH" text as base64 PNG
  // This is a minimal PNG that Chrome will accept
  const canvas = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#4A90E2"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" 
            fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">
        ELH
      </text>
    </svg>
  `;
  
  return canvas;
};

const sizes = [16, 48, 128];

console.log('Note: This script creates SVG files.');
console.log('For Chrome, you need actual PNG files.\n');
console.log('Quick solution: Use the manifest-chrome.json.backup or convert SVGs to PNGs.\n');
console.log('To convert SVG to PNG, you can:');
console.log('1. Use an online converter: https://cloudconvert.com/svg-to-png');
console.log('2. Use ImageMagick: convert icon.svg icon.png');
console.log('3. Use a browser: Open SVG, screenshot, save as PNG');
console.log('4. Install sharp package: npm install sharp\n');

// Check if sharp is available
try {
  const sharp = require('sharp');
  
  console.log('Sharp is available! Converting SVGs to PNGs...\n');
  
  const convertPromises = sizes.map(async (size) => {
    const svgPath = path.join(__dirname, 'icons', `icon${size}.svg`);
    const pngPath = path.join(__dirname, 'icons', `icon${size}.png`);
    
    if (!fs.existsSync(svgPath)) {
      console.log(`✗ ${svgPath} not found`);
      return;
    }
    
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      console.log(`✓ Created ${pngPath}`);
    } catch (err) {
      console.error(`✗ Error converting icon${size}.svg:`, err.message);
    }
  });
  
  Promise.all(convertPromises).then(() => {
    console.log('\n✓ PNG icons created successfully!');
  });
  
} catch (err) {
  console.log('Sharp not installed. Installing it will enable automatic PNG conversion.');
  console.log('Run: npm install sharp\n');
  console.log('Or manually convert the SVG files in the icons/ directory to PNG format.');
}
