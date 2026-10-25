// Downloads the bundled database snapshot into resources/data (shipped with the installer).
const path = require('path');
const fs = require('fs');
const { buildDatabase } = require('../src/main/data/updater');

const outDir = path.join(__dirname, '..', 'resources', 'data');
fs.mkdirSync(outDir, { recursive: true });

buildDatabase({ outDir, onProgress: (p) => process.stdout.write(`\r[${String(p.pct).padStart(3)}%] ${p.key} ${JSON.stringify(p.params || {})}          `) })
  .then((meta) => {
    console.log(`\nDatabase ready: patch ${meta.version}, ${meta.champions} champions, ${meta.items} items, ${meta.failures} failed downloads.`);
  })
  .catch((e) => { console.error('\n', e); process.exit(1); });
