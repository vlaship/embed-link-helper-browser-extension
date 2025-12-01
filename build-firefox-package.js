#!/usr/bin/env node

/**
 * Build script for Firefox extension
 * Creates a distributable package in the dist-firefox folder
 * Automatically increments patch version
 */

const fs = require('fs');
const path = require('path');

console.log('Building Firefox extension package...\n');

// Increment patch version
function incrementVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const version = packageJson.version.split('.');
  version[2] = parseInt(version[2]) + 1;
  const newVersion = version.join('.');
  
  console.log(`Incrementing version: ${packageJson.version} → ${newVersion}\n`);
  
  // Update all manifest files
  packageJson.version = newVersion;
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  
  // Update manifest files
  ['manifest.json', 'manifest-firefox.json', 'manifest-v3.json'].forEach(file => {
    if (fs.existsSync(file)) {
      const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      manifest.version = newVersion;
      fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
    }
  });
  
  return newVersion;
}

const newVersion = incrementVersion();

// Configuration
const distDir = 'dist-firefox';
const filesToCopy = [
  'manifest-firefox.json',
  'background',
  'content',
  'popup',
  'config',
  'utils',
  'lib',
  'icons'
];

const filesToRename = {
  'manifest-firefox.json': 'manifest.json'
};

/**
 * Recursively copy directory
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy file
 */
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

try {
  // Clean dist directory
  if (fs.existsSync(distDir)) {
    console.log('Cleaning existing dist-firefox directory...');
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  // Create dist directory
  fs.mkdirSync(distDir, { recursive: true });
  console.log('✓ Created dist-firefox directory\n');

  // Copy files and directories
  console.log('Copying files...');
  for (const item of filesToCopy) {
    const srcPath = path.join(__dirname, item);
    
    if (!fs.existsSync(srcPath)) {
      console.log(`⚠ Skipping ${item} (not found)`);
      continue;
    }

    const destName = filesToRename[item] || item;
    const destPath = path.join(distDir, destName);

    const stats = fs.statSync(srcPath);
    if (stats.isDirectory()) {
      copyDirectory(srcPath, destPath);
      console.log(`✓ Copied directory: ${item}/`);
    } else {
      copyFile(srcPath, destPath);
      console.log(`✓ Copied file: ${item}`);
    }
  }

  console.log('\n✓ Firefox extension built successfully!');
  console.log(`Version: ${newVersion}`);
  console.log(`\nOutput directory: ${path.resolve(distDir)}`);
  console.log('\nTo load in Firefox:');
  console.log('1. Open Firefox');
  console.log('2. Go to about:debugging#/runtime/this-firefox');
  console.log('3. Click "Load Temporary Add-on"');
  console.log(`4. Select manifest.json from ${distDir}/`);
  console.log('\nTo create a .zip file for distribution:');
  console.log(`  cd ${distDir}`);
  console.log('  zip -r ../social-media-redirector-firefox.zip *');

} catch (error) {
  console.error('✗ Error building Firefox extension:', error.message);
  process.exit(1);
}
