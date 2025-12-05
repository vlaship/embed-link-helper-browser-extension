#!/usr/bin/env node

/**
 * Build script for Chrome extension
 * Creates a distributable package in the dist-chrome folder
 * Automatically increments patch version
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building Chrome extension package...\n');

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
  ['manifest.json', 'manifest-firefox.json', 'manifest-chrome.json'].forEach(file => {
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
const distDir = 'dist-chrome';
const filesToCopy = [
  'manifest-chrome.json',
  'background',
  'content',
  'popup',
  'config',
  'utils',
  'lib',
  'icons'
];

const filesToRename = {
  'manifest-chrome.json': 'manifest.json'
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
    console.log('Cleaning existing dist-chrome directory...');
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  // Create dist directory
  fs.mkdirSync(distDir, { recursive: true });
  console.log('✓ Created dist-chrome directory\n');

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

  console.log('\n✓ Chrome extension built successfully!');
  console.log(`Version: ${newVersion}`);
  console.log(`\nOutput directory: ${path.resolve(distDir)}`);
  
  // Create zip file
  console.log('\nCreating distribution package...');
  const zipFileName = 'embed-link-helper-chrome.zip';
  const zipPath = path.resolve(zipFileName);
  
  // Remove existing zip if present
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  
  try {
    // Change to dist directory and create zip
    const originalDir = process.cwd();
    process.chdir(distDir);
    
    // Use PowerShell with full path
    const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path * -DestinationPath '${path.join(originalDir, zipFileName)}' -Force"`;
    execSync(command);
    
    process.chdir(originalDir);
    console.log(`✓ Created ${zipFileName}`);
    console.log(`\nPackage ready for upload: ${zipPath}`);
  } catch (zipError) {
    console.log(`⚠ Could not create zip automatically: ${zipError.message}`);
    console.log('\nTo create a .zip file manually:');
    console.log(`  cd ${distDir}`);
    console.log('  Compress-Archive -Path * -DestinationPath ../embed-link-helper-chrome.zip');
  }
  
  console.log('\nTo load in Chrome:');
  console.log('1. Open Chrome');
  console.log('2. Go to chrome://extensions/');
  console.log('3. Enable "Developer mode"');
  console.log('4. Click "Load unpacked"');
  console.log(`5. Select the ${distDir}/ directory`);

} catch (error) {
  console.error('✗ Error building Chrome extension:', error.message);
  process.exit(1);
}
