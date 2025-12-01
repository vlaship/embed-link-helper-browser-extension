#!/usr/bin/env node

/**
 * Restore Chrome manifest after Firefox build
 */

const fs = require('fs');

console.log('Restoring Chrome manifest...');

if (fs.existsSync('manifest-chrome.json.backup')) {
  fs.copyFileSync('manifest-chrome.json.backup', 'manifest.json');
  fs.unlinkSync('manifest-chrome.json.backup');
  console.log('✓ Chrome manifest restored');
} else {
  console.error('✗ No backup found!');
  process.exit(1);
}

console.log('\n✓ Chrome build ready!');
