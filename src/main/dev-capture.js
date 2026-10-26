// Development helper: with LOLHELPER_CAPTURE=<dir>, walks through the main views, saves
// screenshots of each (scrolled page by page) and of the overlay into <dir> and quits.
// LOLHELPER_CAPTURE_SIZE=<w>x<h> sets the window size. Not used in normal runs.
const fs = require('fs');
const path = require('path');

const click = (sel) => `document.querySelector('${sel}') && document.querySelector('${sel}').click()`;
// A manual draft: the player's team with the player on mid, the enemy team picked.
const DRAFT = `(() => { const s = window.lolhelper.state.manual;
  s.myTeam = ['Sion', 'Warwick', 'Akali', 'Kalista', 'Teemo']; s.theirTeam = ['Garen', 'XinZhao', 'Vex', 'Ezreal', 'Zyra']; s.myRole = 'MIDDLE';
  window.lolhelper.navigate('build'); setTimeout(() => window.lolhelper.navigate('draft'), 100); })()`;

const STEPS = [
  ['draft', DRAFT],
  ['live', click('[data-view=live]')],
  ['history', `${click('[data-view=history]')}; setTimeout(() => document.querySelector('.hist-main') && document.querySelector('.hist-main').click(), 300)`],
  ['build', "window.lolhelper.state.buildTarget = { championId: 'XinZhao', enemyId: 'Warwick', role: 'JUNGLE' }; window.lolhelper.navigate('build')"],
  ['champions', click('[data-view=champions]')],
  ['champion', click('.champ-card')],
  ['items', `${click('[data-view=items]')}; setTimeout(() => document.querySelector('.item-card') && document.querySelector('.item-card').click(), 200)`],
  ['settings', click('[data-view=settings]')],
];

module.exports = function capture(win, app, dir, prepare = '', overlay = null) {
  fs.mkdirSync(dir, { recursive: true });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const size = /^(\d+)x(\d+)$/.exec(process.env.LOLHELPER_CAPTURE_SIZE || '');
  if (size) win.setSize(Number(size[1]), Number(size[2]));
  const shot = async (w, name) => fs.writeFileSync(path.join(dir, `${name}.png`), (await w.webContents.capturePage()).toPNG());
  win.webContents.once('did-finish-load', async () => {
    await wait(2500);
    if (prepare) await win.webContents.executeJavaScript(prepare);
    for (const [name, js] of STEPS) {
      await win.webContents.executeJavaScript(js).catch(() => {});
      await wait(2500);
      // Page by page down the scrolling view.
      const pages = await win.webContents.executeJavaScript("(() => { const v = document.querySelector('.view'); return v ? Math.ceil(v.scrollHeight / v.clientHeight) : 1; })()").catch(() => 1);
      for (let p = 0; p < Math.min(pages, 6); p += 1) {
        await win.webContents.executeJavaScript(`document.querySelector('.view') && (document.querySelector('.view').scrollTop = ${p} * document.querySelector('.view').clientHeight * 0.9)`).catch(() => {});
        await wait(300);
        await shot(win, p ? `${name}-${p + 1}` : name);
      }
      // Horizontal overflow anywhere in the view is a layout bug.
      const wide = await win.webContents.executeJavaScript(`[...document.querySelectorAll('.view *')].filter((e) => e.scrollWidth > e.clientWidth + 1 && !['auto', 'scroll', 'hidden'].includes(getComputedStyle(e).overflowX)).slice(0, 10).map((e) => e.className + ' ' + e.scrollWidth + '>' + e.clientWidth)`).catch(() => []);
      if (wide.length) console.log(`[capture] ${name} overflow:`, wide.join(' | '));
    }
    if (overlay && overlay.win && !overlay.win.isDestroyed() && overlay.win.isVisible()) await shot(overlay.win, 'overlay');
    app.quit();
  });
};
