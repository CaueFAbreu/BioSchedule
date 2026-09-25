// Update asset URLs after editing CSS or JavaScript, before publishing.
// Every local .css/.js referenced by index.html gets ?v=<content hash>.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const index = path.join(root, 'index.html');
const html = fs.readFileSync(index, 'utf8');

const updated = html.replace(/((?:href|src)=")([\w./-]+\.(?:css|js))(?:\?v=[^"\s]*)?"/g, (match, attr, file) => {
  const source = path.join(root, file);
  if (!source.startsWith(root + path.sep) || !fs.existsSync(source)) throw Error(`Asset not found: ${file}`);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex').slice(0, 12);
  return `${attr}${file}?v=${hash}"`;
});

fs.writeFileSync(index, updated);
console.log('Asset URLs updated from file content hashes.');
