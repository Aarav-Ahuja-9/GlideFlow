const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src/app/landing.module.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Colors & General Theme
css = css.replace(/#030308/g, '#0f172a'); // lighter sleek dark background
css = css.replace(/#06b6d4/g, '#3b82f6'); // cyan -> elegant blue
css = css.replace(/rgba\(6, 182, 212/g, 'rgba(59, 130, 246');
css = css.replace(/#d946ef/g, '#8b5cf6'); // magenta -> smooth purple
css = css.replace(/rgba\(217, 70, 239/g, 'rgba(139, 92, 246');
css = css.replace(/#34d399/g, '#10b981'); // emerald
css = css.replace(/rgba\(4, 4, 12, 0.9\)/g, 'rgba(15, 23, 42, 0.75)');

// Glassmorphism core additions
css = css.replace(/border: 1px solid rgba\(6, 182, 212, 0\.15\);/g, 'border: 1px solid rgba(255, 255, 255, 0.1);');
css = css.replace(/border: 1px solid rgba\(6, 182, 212, 0\.2\);/g, 'border: 1px solid rgba(255, 255, 255, 0.15);');
css = css.replace(/border: 1px solid rgba\(6, 182, 212, 0\.25\);/g, 'border: 1px solid rgba(255, 255, 255, 0.2);');

// Typography soften
css = css.replace(/font-family: monospace;/g, 'font-family: var(--font-sans), system-ui, sans-serif;');
css = css.replace(/text-transform: uppercase;/g, '/* text-transform: uppercase; */');
css = css.replace(/letter-spacing: 0\.5px;/g, 'letter-spacing: -0.01em;');

// Enhanced Blur / Glass
css = css.replace(/backdrop-filter: blur\((.*?)\)/g, 'backdrop-filter: blur(24px)');
css = css.replace(/background-color: rgba\(3, 3, 8, 0\.65\);/g, 'background-color: rgba(15, 23, 42, 0.5); border-bottom: 1px solid rgba(255, 255, 255, 0.08);');
css = css.replace(/background: rgba\(8, 8, 16, 0\.7\);/g, 'background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px;');

// Buttons & Pills
css = css.replace(/border-radius: 4px;/g, 'border-radius: 12px;');
css = css.replace(/border-radius: 6px;/g, 'border-radius: 16px;');
css = css.replace(/border-radius: 8px;/g, 'border-radius: 20px;');
css = css.replace(/border-radius: 10px;/g, 'border-radius: 24px;');

// Drop shadows
css = css.replace(/box-shadow: 0 0 15px rgba\(6, 182, 212, 0\.3\);/g, 'box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);');
css = css.replace(/box-shadow: 0 4px 15px rgba\(6, 182, 212, 0\.2\);/g, 'box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);');
css = css.replace(/box-shadow: 0 6px 20px rgba\(6, 182, 212, 0\.4\);/g, 'box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);');

fs.writeFileSync(cssPath, css);
console.log('CSS transformed to Glassmorphism');
