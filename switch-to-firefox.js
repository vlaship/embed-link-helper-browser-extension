#!/usr/bin/env node

/**
 * Switch manifest to Firefox (Manifest V2) version
 * This script restores the Firefox manifest
 */

const fs = require('fs');
const path = require('path');

console.log('Switching to Firefox (Manifest V2) version...\n');

try {
  // Restore Firefox manifest
  if (fs.existsSync('manifest-firefox.json')) {
    fs.copyFileSync('manifest-firefox.json', 'manifest.json');
    console.log('✓ Restored Firefox manifest from manifest-firefox.json');
  } else {
    console.error('✗ manifest-firefox.json not found!');
    console.log('Creating from scratch...');
    
    // If no backup exists, we need to recreate it
    console.error('Please restore manually or use the original manifest.json');
    process.exit(1);
  }

  console.log('\n✓ Successfully switched to Firefox version!');
  console.log('\nYou can now load the extension in Firefox:');
  console.log('1. Open Firefox');
  console.log('2. Go to about:debugging#/runtime/this-firefox');
  console.log('3. Click "Load Temporary Add-on"');
  console.log('4. Select manifest.json from this directory');

} catch (error) {
  console.error('✗ Error switching manifest:', error.message);
  process.exit(1);
}
