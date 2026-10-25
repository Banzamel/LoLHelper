// Versioning helper. package.json "version" is the single source of truth.
//   node scripts/version.js stamp        — (npm "version" hook) moves "Unreleased" changelog
//                                          entries into a "## [x.y.z] - date" section
//   node scripts/version.js check [tag]  — verifies the tag (or GITHUB_REF_NAME) matches
//                                          package.json and that CHANGELOG.md has the version
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const changelogPath = path.join(root, 'CHANGELOG.md');
const fail = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };

function stamp() {
  const log = fs.readFileSync(changelogPath, 'utf8');
  if (log.includes(`## [${pkg.version}]`)) return console.log(`CHANGELOG already has ${pkg.version}`);
  const m = log.match(/## \[Unreleased\]\s*\n([\s\S]*?)(?=\n## \[|$)/);
  if (!m || !m[1].trim()) fail('CHANGELOG.md: add your changes under "## [Unreleased]" before bumping the version.');
  const date = new Date().toISOString().slice(0, 10);
  const next = log.replace(m[0], `## [Unreleased]\n\n## [${pkg.version}] - ${date}\n${m[1].replace(/\s+$/, '')}\n`);
  fs.writeFileSync(changelogPath, next);
  console.log(`CHANGELOG: released ${pkg.version} (${date})`);
}

function check(tagArg) {
  if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(pkg.version)) fail(`package.json version "${pkg.version}" is not SemVer`);
  const tag = tagArg || process.env.GITHUB_REF_NAME;
  if (tag && tag !== `v${pkg.version}`) fail(`tag ${tag} does not match package.json version v${pkg.version}`);
  if (!fs.readFileSync(changelogPath, 'utf8').includes(`## [${pkg.version}]`)) fail(`CHANGELOG.md has no "## [${pkg.version}]" section`);
  console.log(`✔ version ${pkg.version}${tag ? ` matches tag ${tag}` : ''}`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'stamp') stamp();
else if (cmd === 'check') check(arg);
else fail('usage: node scripts/version.js stamp | check [tag]');
