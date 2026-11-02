import fs from 'node:fs';
import path from 'node:path';

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const serverDir = 'D:/screenshot-exact/.output/server';
const publicDir = 'D:/screenshot-exact/.output/public';

console.log("Copiando chunks de Nitro server a .output/public/...");
copyDir(serverDir, publicDir);

// Renombrar index.mjs a _worker.js si es necesario
const workerFile = path.join(publicDir, '_worker.js');
const serverIndex = path.join(publicDir, 'index.mjs');
if (fs.existsSync(serverIndex)) {
  fs.copyFileSync(serverIndex, workerFile);
  console.log("SUCCESS: _worker.js preparado correctamente.");
}
