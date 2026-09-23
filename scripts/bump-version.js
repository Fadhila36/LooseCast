/**
 * Version Bumper Script
 * Automatically increments version in package.json and package-lock.json.
 * Usage:
 *   node scripts/bump-version.js [patch|minor|major]
 *   Default: patch
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');
const LOCK_PATH = path.join(ROOT_DIR, 'package-lock.json');

const type = (process.argv[2] || 'patch').toLowerCase();

function bump(currentVersion, bumpType) {
  const parts = currentVersion.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semver version: "${currentVersion}"`);
  }

  let [major, minor, patch] = parts;
  if (bumpType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bumpType === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    // default: patch
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

try {
  const pkgContent = fs.readFileSync(PKG_PATH, 'utf8');
  const pkg = JSON.parse(pkgContent);
  const oldVersion = pkg.version || '0.0.1';
  const newVersion = bump(oldVersion, type);

  pkg.version = newVersion;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  if (fs.existsSync(LOCK_PATH)) {
    const lockContent = fs.readFileSync(LOCK_PATH, 'utf8');
    const lock = JSON.parse(lockContent);
    lock.version = newVersion;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = newVersion;
    }
    fs.writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  }

  console.log(`[version-bumper] Successfully bumped version from v${oldVersion} to v${newVersion} (${type})`);
} catch (err) {
  console.error(`[version-bumper] Error bumping version: ${err.message}`);
  process.exit(1);
}
