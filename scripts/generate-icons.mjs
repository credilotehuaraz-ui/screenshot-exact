import fs from 'node:fs';

function generateSVGIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#0f172a"/>
  <rect x="${size * 0.15}" y="${size * 0.15}" width="${size * 0.7}" height="${size * 0.7}" rx="${size * 0.15}" fill="#6366f1"/>
  <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="${size * 0.38}" fill="#ffffff">CC</text>
</svg>`;
}

fs.writeFileSync('D:/screenshot-exact/public/icon.svg', generateSVGIcon(512));
fs.writeFileSync('D:/screenshot-exact/public/icon-192.svg', generateSVGIcon(192));
fs.writeFileSync('D:/screenshot-exact/public/icon-512.svg', generateSVGIcon(512));

console.log("SUCCESS: Íconos SVG creados en public/");
