// Rune presets tuned for the matchup, summoner spells and skill orders.
import { test } from 'vitest';
import assert from 'node:assert';
import { loadDatabase } from '../../../helpers.ts';
import { rolePreset, tune } from '../../../../src/core/engine/loadout/presets.ts';
import { pickSpells, skillOrder } from '../../../../src/core/engine/loadout/skills.ts';
import type { Threats } from '../../../../src/core/engine/types.ts';

const db = loadDatabase();
const calm: Threats = { ad: 0.5, ap: 0.5, healing: 0, tanks: 0, burstAD: 0, burstAP: 0, cc: 0, autoAttack: 0, shields: 0, empty: false };

test('a jungle tank plays Aftershock and the preset is a fresh copy', () => {
  const p = rolePreset('tank', 'JUNGLE');
  p.rows.push('changed');
  assert.strictEqual(p.keystone, 'Aftershock');
  assert.strictEqual(rolePreset('tank', 'JUNGLE').rows.length, 3);
});

test('a marksman against tanks takes Cut Down and heavy CC brings the tenacity shard', () => {
  const { p, reasons } = tune('marksman', 'BOTTOM', null, { ...calm, tanks: 0.5, cc: 2.5 });
  assert.deepStrictEqual([p.rows[2], p.shards[2], reasons], ['Cut Down', 5013, ['loadout.cutDown', 'loadout.tenacity']]);
});

test('junglers take Smite, bottom laners Heal or Cleanse', () => {
  assert.deepStrictEqual(pickSpells('bruiser', 'JUNGLE', null, calm).spells, ['SummonerFlash', 'SummonerSmite']);
  assert.strictEqual(pickSpells('marksman', 'BOTTOM', null, { ...calm, cc: 3 }).spells[1], 'SummonerBoost');
});

test('a known max order is used and the table has 18 levels', () => {
  const s = skillOrder(db.byId.Jinx, 'marksman');
  assert.deepStrictEqual([s.max, s.known, s.levels?.length], [['Q', 'W', 'E'], true, 18]);
});
