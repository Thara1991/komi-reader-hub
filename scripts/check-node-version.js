#!/usr/bin/env node

// Check if Node.js version is 18 or higher
const requiredVersion = 18;
const currentVersion = parseInt(process.version.slice(1).split('.')[0]);

if (currentVersion < requiredVersion) {
  console.error(`❌ Node.js ${requiredVersion}+ is required. Current version: ${process.version}`);
  console.error(`💡 Please run: nvm use 18`);
  process.exit(1);
}

console.log(`✅ Node.js version ${process.version} is compatible`);
process.exit(0);
