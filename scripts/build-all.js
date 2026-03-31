#!/usr/bin/env node
/**
 * Script de build para KMCVet.
 * Compila: shared → api → web
 * Uso: node scripts/build-all.js
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
// tsc está en el root (pnpm hoist), vite está en apps/web (no hoisted)
const tsc = path.join(root, 'node_modules', '.bin', 'tsc.cmd');
// vite está en apps/web/node_modules
const viteBin = path.join(root, 'apps', 'web', 'node_modules', '.bin', 'vite.cmd');

function run(cmd, cwd) {
  console.log(`\n▶ ${cmd} (en ${path.relative(root, cwd) || '.'})`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

// 1. Compilar packages/shared
const sharedDir = path.join(root, 'packages', 'shared');
run(`"${tsc}" -p tsconfig.json --noEmit false`, sharedDir);
if (!fs.existsSync(path.join(sharedDir, 'dist', 'index.js'))) {
  throw new Error('ERROR: shared/dist/index.js no fue generado por tsc');
}
console.log('✓ shared compilado');

// 2. Compilar apps/api
const apiDir = path.join(root, 'apps', 'api');
run(`"${tsc}" -p tsconfig.json --noEmit false`, apiDir);
if (!fs.existsSync(path.join(apiDir, 'dist', 'main.js'))) {
  throw new Error('ERROR: api/dist/main.js no fue generado por tsc');
}
console.log('✓ api compilado');

// 3. Compilar apps/web → apps/api/public
const webDir = path.join(root, 'apps', 'web');
run(`"${viteBin}" build`, webDir);
console.log('✓ web compilado → apps/api/public');

console.log('\n✅ Build completo. Para ejecutar:');
console.log('   cd apps/api && node dist/main.js');
