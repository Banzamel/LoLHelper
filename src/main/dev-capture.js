// Development helper: with LOLHELPER_CAPTURE=<dir>, walks through the main views,
// saves a screenshot of each into <dir> and quits. Not used in normal runs.
const fs = require('fs');
const path = require('path');

const STEPS = [
  ['draft', "document.querySelector('[data-view=draft]').click()"],
  ['build', "document.querySelector('[data-view=build]').click()"],
  ['champions', "document.querySelector('[data-view=champions]').click()"],
  ['champion', "document.querySelector('.champ-card').click()"],
  ['items', "document.querySelector('[data-view=items]').click(); setTimeout(() => document.querySelector('.item-card').click(), 200)"],
  ['settings', "document.querySelector('[data-view=settings]').click()"],
];

module.exports = function capture(win, app, dir, prepare = '') {
  fs.mkdirSync(dir, { recursive: true });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  win.webContents.once('did-finish-load', async () => {
    await wait(2500);
    if (prepare) await win.webContents.executeJavaScript(prepare);
    for (const [name, js] of STEPS) {
      await win.webContents.executeJavaScript(js).catch(() => {});
      await wait(1500);
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(dir, `${name}.png`), img.toPNG());
    }
    app.quit();
  });
};
