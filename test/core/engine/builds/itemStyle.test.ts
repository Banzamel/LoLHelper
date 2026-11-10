// The item style of a champion: its class unless its kit says otherwise (needs `npm run fetch-data`).
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { classOf } from '../../../../src/core/engine/builds/classOf.ts';
import { itemStyle } from '../../../../src/core/engine/builds/itemStyle.ts';
import { recommendBuild } from '../../../../src/core/engine/builds/recommendBuild.ts';

const db = loadDatabase();
const style = (id: string) => { const c = db.byId[id]; return itemStyle(c, classOf(c, c.positions[0])); };
const build = (id: string) => recommendBuild(db, { championId: id, role: db.byId[id].positions[0] });
const names = (ids: number[]) => ids.map((i) => db.itemById[i].nameEn);

test('most champions keep the style of their class', () => {
  for (const [id, cls] of [['Jinx', 'marksman'], ['Caitlyn', 'marksman'], ['Draven', 'marksman'], ['Zed', 'assassin-ad'], ['Darius', 'bruiser'], ['Fiora', 'bruiser'],
    ['Syndra', 'mage-burst'], ['Azir', 'mage-burst'], ['Malphite', 'tank'], ['Lulu', 'enchanter']]) assert.strictEqual(style(id), cls, id);
  const { scaling, ...unknown } = db.byId.MasterYi;
  assert.ok(scaling);
  assert.strictEqual(itemStyle(unknown, 'assassin-ad'), 'assassin-ad');
});

test('the kit decides where the class builds wrongly', () => {
  for (const id of ['MasterYi', 'Belveth', 'Vayne', 'KogMaw', 'Kalista']) assert.strictEqual(style(id), 'onhit', id);
  for (const id of ['Yasuo', 'Yone', 'Tryndamere', 'Gangplank']) assert.strictEqual(style(id), 'crit-fighter', id);
  for (const id of ['Kaisa', 'Teemo']) assert.strictEqual(style(id), 'ap-attacker', id);
  assert.strictEqual(style('Ezreal'), 'caster-ad');
  assert.strictEqual(style('Akali'), 'mage-burst');
});

test('the build follows the style: attack speed and on-hit, crit, AP, no wasted crit', () => {
  const stat = (b: ReturnType<typeof build>, s: string) => b.full.reduce((sum, i) => sum + (db.itemById[i].features.stats[s] || 0), 0);
  const yi = build('MasterYi');
  assert.strictEqual(yi.style, 'onhit');
  assert.ok(stat(yi, 'as') >= 100 && stat(yi, 'lethality') === 0, names(yi.full).join());
  assert.ok(yi.full.filter((i) => db.itemById[i].features.flags.onHitDamage).length >= 3);
  assert.strictEqual(db.itemById[yi.boots!.id].nameEn, "Berserker's Greaves");
  const yasuo = build('Yasuo');
  assert.ok(stat(yasuo, 'crit') >= 50 && stat(yasuo, 'lethality') <= 10, names(yasuo.full).join());
  const akali = build('Akali');
  assert.ok(stat(akali, 'ap') >= 300 && stat(akali, 'ad') === 0, names(akali.full).join());
  const ezreal = build('Ezreal');
  assert.ok(names(ezreal.full).includes('Manamune') && stat(ezreal, 'crit') === 0, names(ezreal.full).join());
  // A bruiser gets no crit chance it cannot use.
  assert.strictEqual(stat(build('Darius'), 'crit'), 0);
});
