#!/usr/bin/env node

/**
 * Switch manifest to Chrome (Manifest V3) version
 * This script backs up the current manifest and replaces it with the Chrome version
 */

const fs = require('fs');
const path = require('path');

console.log('Switching to Chrome (Manifest V3) version...\n');

try {
  // Backup current manifest if it's not already backed up
  if (fs.existsSync('manifest.json') && !fs.existsSync('manifest-firefox.json')) {
    fs.copyFileSync('manifest.json', 'manifest-firefox.json');
    console.log('✓ Backed up Firefox manifest to manifest-firefox.json');
  }

  // Copy Chrome manifest to manifest.json
  if (fs.existsSync('manifest-v3.json')) {
    fs.copyFileSync('manifest-v3.json', 'manifest.json');
    console.log('✓ Copied manifest-v3.json to manifest.json');
  } else {
    console.error('✗ manifest-v3.json not found!');
    process.exit(1);
  }

  console.log('\n✓ Successfully switched to Chrome version!');
  console.log('\nYou can now load the extension in Chrome:');
  console.log('1. Open Chrome');
  console.log('2. Go to chrome://extensions/');
  console.log('3. Enable "Developer mode"');
  console.log('4. Click "Load unpacked"');
  console.log('5. Select this directory');
  console.log('\nTo switch back to Firefox, run: node switch-to-firefox.js');

} catch (error) {
  console.error('✗ Error switching manifest:', error.message);
  process.exit(1);
}
