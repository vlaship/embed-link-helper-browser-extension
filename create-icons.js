#!/usr/bin/env node

/**
 * Creates simple SVG placeholder icons for the extension
 * These can be converted to PNG using online tools or image editors
 */

const fs = require('fs');
const path = require('path');

const createSVGIcon = (size) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4A90E2"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" 
        fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">
    SMR
  </text>
</svg>`;
};

const sizes = [16, 48, 128];

console.log('Creating placeholder SVG icons...\n');

sizes.forEach(size => {
  const filename = `icons/icon${size}.svg`;
  fs.writeFileSync(filename, createSVGIcon(size));
  console.log(`✓ Created ${filename}`);
});

console.log('\n✓ SVG icons created!');
console.log('\nNote: For production, convert these SVG files to PNG format.');
console.log('You can use online tools like:');
console.log('  - https://cloudconvert.com/svg-to-png');
console.log('  - https://svgtopng.com/');
console.log('\nOr use an image editor like GIMP, Photoshop, or Inkscape.');

