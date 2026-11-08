// `npm run release:manifests [bundle dir]`: puts the signed NSIS setup into release/ under its
// release name and writes the two update manifests published with it:
//   latest.json — the Tauri updater (versions 0.13+), with the setup's minisign signature;
//   latest.yml  — electron-updater (the Electron versions up to 0.12.x), so they update straight
//                 into this installer (it uninstalls them and the new app carries their data over).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const bundle = process.argv[2] || path.join(root, 'src-tauri', 'target', 'x86_64-pc-windows-msvc', 'release', 'bundle', 'nsis');
const repo = 'https://github.com/Banzamel/LoLHelper';
const setupName = `LoLHelper-Setup-${version}.exe`;
const out = path.join(root, 'release');

const fail = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };
const built = path.join(bundle, `LoL Helper_${version}_x64-setup.exe`);
if (!fs.existsSync(built)) fail(`no installer at ${built}`);
if (!fs.existsSync(`${built}.sig`)) fail(`no signature at ${built}.sig (build with createUpdaterArtifacts and TAURI_SIGNING_PRIVATE_KEY)`);

fs.mkdirSync(out, { recursive: true });
const setup = path.join(out, setupName);
fs.copyFileSync(built, setup);
fs.copyFileSync(`${built}.sig`, `${setup}.sig`);

const bytes = fs.readFileSync(setup);
const sha512 = crypto.createHash('sha512').update(bytes).digest('base64');
const notesFile = path.join(root, 'release-notes.md');
const notes = fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8') : '';
const now = new Date().toISOString();

const latestJson = {
  version,
  notes,
  pub_date: now,
  platforms: {
    'windows-x86_64': { signature: fs.readFileSync(`${setup}.sig`, 'utf8').trim(), url: `${repo}/releases/download/v${version}/${setupName}` },
  },
};
fs.writeFileSync(path.join(out, 'latest.json'), `${JSON.stringify(latestJson, null, 2)}\n`);

// electron-updater resolves `url` against the release of the tag and checks sha512 and size.
const latestYml = [
  `version: ${version}`,
  'files:',
  `  - url: ${setupName}`,
  `    sha512: ${sha512}`,
  `    size: ${bytes.length}`,
  `path: ${setupName}`,
  `sha512: ${sha512}`,
  `releaseDate: '${now}'`,
  '',
].join('\n');
fs.writeFileSync(path.join(out, 'latest.yml'), latestYml);

console.log(`release/ ready: ${setupName} (${bytes.length} bytes), .sig, latest.json, latest.yml`);
