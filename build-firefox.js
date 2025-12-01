#!/usr/bin/env node

/**
 * Build script for Firefox version
 * Copies manifest-firefox.json to manifest.json for Firefox builds
 */

const fs = require('fs');
const path = require('path');

console.log('Building Firefox version...');

// Backup original manifest
if (fs.existsSync('manifest.json')) {
  fs.copyFileSync('manifest.json', 'manifest-chrome.json.backup');
  console.log('✓ Backed up Chrome manifest');
}

// Copy Firefox manifest
if (fs.existsSync('manifest-firefox.json')) {
  fs.copyFileSync('manifest-firefox.json', 'manifest.json');
  console.log('✓ Copied Firefox manifest');
} else {
  console.error('✗ manifest-firefox.json not found!');
  process.exit(1);
}

console.log('\n✓ Firefox build ready!');
console.log('To restore Chrome manifest, run: node restore-chrome.js');
