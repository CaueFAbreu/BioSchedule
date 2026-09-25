// Update asset URLs after editing CSS or JavaScript, before publishing.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const index = path.join(root, 'index.html');
let html = fs.readFileSync(index, 'utf8');
for (const file of ['styles.css', 'data.js', 'core.js', 'app.js']) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').slice(0, 12);
  const escaped = file.replace(/\./g, '\\.');
  html = html.replace(new RegExp(`((?:href|src)=")${escaped}(?:\\?v=[^"\\s]*)?"`, 'g'), `$1${file}?v=${hash}"`);
}
fs.writeFileSync(index, html);
console.log('Asset URLs updated from file content hashes.');
