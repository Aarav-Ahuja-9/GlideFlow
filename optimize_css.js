const fs = require('fs');
const path = require('path');

// 1. Optimize page.tsx
const pagePath = path.join(__dirname, 'src/app/page.tsx');
let pageText = fs.readFileSync(pagePath, 'utf8');

// Remove IntersectionObserver useEffect entirely
pageText = pageText.replace(/  \/\/ Intersection Observer for scroll animations[\s\S]*?\}, \[\]\);\n\n/g, '');

// Remove animation classes
pageText = pageText.replace(/ \$\{styles\.animateOnScroll\}/g, '');
pageText = pageText.replace(/ \$\{styles\.cascadeItem\}/g, '');

fs.writeFileSync(pagePath, pageText);
console.log('page.tsx optimized.');

// 2. Optimize landing.module.css
const cssPath = path.join(__dirname, 'src/app/landing.module.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Remove heavy backdrop filters and blurs
css = css.replace(/backdrop-filter: [^;]+;/g, '');
css = css.replace(/-webkit-backdrop-filter: [^;]+;/g, '');
css = css.replace(/filter: blur[^;]+;/g, '');

// Convert semi-transparent backgrounds to solid for better performance
css = css.replace(/background-color: rgba\(15, 23, 42, 0\.5\);/g, 'background-color: #0f172a;');
css = css.replace(/background: rgba\(255, 255, 255, 0\.03\);/g, 'background-color: #1e293b;');
css = css.replace(/background-color: rgba\(4, 4, 12, 0\.9\);/g, 'background-color: #020617;');
css = css.replace(/background: rgba\(0, 0, 0, 0\.4\);/g, 'background-color: #1e293b;');
css = css.replace(/background: rgba\(0, 0, 0, 0\.3\);/g, 'background-color: #0f172a;');
css = css.replace(/background: rgba\(8, 8, 16, 0\.8\);/g, 'background-color: #1e293b;');
css = css.replace(/background-color: rgba\(6, 6, 12, 0\.7\);/g, 'background-color: #0f172a;');

// Remove heavy drop shadows
css = css.replace(/box-shadow: [^;]+;/g, 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);');

// Remove animations
css = css.replace(/animation: [^;]+;/g, '');

// Make .animateOnScroll elements visible by default in case any are left
css = css.replace(/\.animateOnScroll\s*\{[\s\S]*?\}/, '.animateOnScroll { opacity: 1; }');
css = css.replace(/\.animateVisible\s*\{[\s\S]*?\}/, '');

fs.writeFileSync(cssPath, css);
console.log('landing.module.css optimized.');
