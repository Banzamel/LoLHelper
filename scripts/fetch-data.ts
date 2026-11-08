// Downloads the bundled database snapshot into resources/data (shipped with the installer).
// Runs on Node with type stripping: `npm run fetch-data`.
import fs from 'node:fs';
import path from 'node:path';
import { buildDatabase, type BuilderIo } from '../src/core/data/builder/buildDatabase.ts';

const outDir = path.join(import.meta.dirname, '..', 'resources', 'data');
const CONCURRENCY = 16;

async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function downloadFile(url: string, dest: string) {
  if (fs.existsSync(dest)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

const io: BuilderIo = {
  getJson,
  async writeText(rel, text) {
    fs.mkdirSync(path.dirname(path.join(outDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(outDir, rel), text);
  },
  async download(files, onTick) {
    let next = 0;
    let done = 0;
    const failures: string[] = [];
    const worker = async () => {
      while (next < files.length) {
        const f = files[next++];
        try { await downloadFile(f.url, path.join(outDir, f.rel)); } catch (e) { failures.push((e as Error).message); }
        onTick(++done, files.length);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    return failures;
  },
};

fs.mkdirSync(outDir, { recursive: true });
buildDatabase({ io, onProgress: (p) => process.stdout.write(`\r[${String(p.pct).padStart(3)}%] ${p.key} ${JSON.stringify(p.params || {})}          `) })
  .then((meta) => console.log(`\nDatabase ready: patch ${meta.version}, ${meta.champions} champions, ${meta.items} items, ${meta.failures} failed downloads.`))
  .catch((e) => { console.error('\n', e); process.exit(1); });
