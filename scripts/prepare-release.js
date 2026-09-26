/**
 * Release Preparation & Artifact Normalization Script
 * Copies and standardizes Tauri build outputs into the ./release directory.
 * Output filenames match the established GitHub release conventions:
 *   - LooseCast-Setup-<version>.exe (NSIS Installer)
 *   - LooseCast-Portable-<version>.exe (Portable Executable)
 *   - LooseCast_<version>_x64_en-US.msi (Windows MSI Package)
 *   - SHA256SUMS.txt (Cryptographic Checksums)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const TAURI_RELEASE_DIR = path.join(ROOT_DIR, 'src-tauri', 'target', 'release');

function getSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

try {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const version = pkg.version || '1.1.0';

  if (!fs.existsSync(RELEASE_DIR)) {
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
  }

  const artifacts = [];

  // 1. NSIS Setup Executable
  const nsisDir = path.join(TAURI_RELEASE_DIR, 'bundle', 'nsis');
  if (fs.existsSync(nsisDir)) {
    const nsisFiles = fs.readdirSync(nsisDir).filter((f) => f.endsWith('-setup.exe') || f.endsWith('.exe'));
    if (nsisFiles.length > 0) {
      const srcFile = path.join(nsisDir, nsisFiles[0]);
      const destFile = path.join(RELEASE_DIR, `LooseCast-Setup-${version}.exe`);
      fs.copyFileSync(srcFile, destFile);
      artifacts.push({ name: `LooseCast-Setup-${version}.exe`, path: destFile, size: fs.statSync(destFile).size });
    }
  }

  // 2. Standalone Portable Executable
  const portableExe = path.join(TAURI_RELEASE_DIR, 'loosecast.exe');
  if (fs.existsSync(portableExe)) {
    const destFile = path.join(RELEASE_DIR, `LooseCast-Portable-${version}.exe`);
    fs.copyFileSync(portableExe, destFile);
    artifacts.push({ name: `LooseCast-Portable-${version}.exe`, path: destFile, size: fs.statSync(destFile).size });
  }

  // 3. MSI Windows Installer
  const msiDir = path.join(TAURI_RELEASE_DIR, 'bundle', 'msi');
  if (fs.existsSync(msiDir)) {
    const msiFiles = fs.readdirSync(msiDir).filter((f) => f.endsWith('.msi'));
    if (msiFiles.length > 0) {
      const srcFile = path.join(msiDir, msiFiles[0]);
      const destFile = path.join(RELEASE_DIR, `LooseCast_${version}_x64_en-US.msi`);
      fs.copyFileSync(srcFile, destFile);
      artifacts.push({ name: `LooseCast_${version}_x64_en-US.msi`, path: destFile, size: fs.statSync(destFile).size });
    }
  }

  if (artifacts.length === 0) {
    console.warn('[prepare-release] No build artifacts found in src-tauri/target/release. Please run `npm run tauri:build` first.');
    process.exit(0);
  }

  // 4. Generate SHA256 Checksums
  const checksumLines = artifacts.map((a) => `${getSha256(a.path)}  ${a.name}`);
  const checksumPath = path.join(RELEASE_DIR, 'SHA256SUMS.txt');
  fs.writeFileSync(checksumPath, checksumLines.join('\n') + '\n', 'utf8');

  console.log(`\n========================================`);
  console.log(` LooseCast v${version} Release Assets Prepared:`);
  console.log(`========================================`);
  artifacts.forEach((a) => {
    console.log(`  📦 ${a.name.padEnd(35)} [${formatBytes(a.size)}]`);
  });
  console.log(`  🔒 SHA256SUMS.txt                   [Checksums]`);
  console.log(`========================================\n`);
} catch (err) {
  console.error(`[prepare-release] Error: ${err.message}`);
  process.exit(1);
}
