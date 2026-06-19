const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src/app/landing.module.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Replace any occurrence of "-webkit-" on its own line or followed only by spaces
css = css.replace(/^\s*-webkit-\s*$/gm, '');

fs.writeFileSync(cssPath, css);
console.log('Fixed all dangling -webkit- prefixes in CSS');
