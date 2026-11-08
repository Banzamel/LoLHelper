// One team of a past game: result, objectives and every player with KDA, CS, damage, gold and
// items; a player opens the player sheet.
import type { CompactGame, CompactPlayer } from '../../../core/matches/types.ts';
import { fmtGold, kdaText } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { COLORS } from '../../../shared/ui/charts/chartLayout.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { ChampIcon, ItemIcon, useGameData } from '../../database/index.ts';
import { usePlayerSheet } from '../hooks/usePlayerSheet.tsx';

export function TeamBlock({ game, teamId, me }: { game: CompactGame; teamId: number; me: CompactPlayer }) {
  const t = useT();
  const data = useGameData();
  const openPlayer = usePlayerSheet();
  const team = game.teams.find((x) => x.id === teamId);
  const players = game.players.filter((p) => p.team === teamId);
  const ally = teamId === me.team;
  const maxDmg = Math.max(1, ...game.players.map((p) => p.dmg));
  const open = (p: CompactPlayer) => openPlayer({
    puuid: p.puuid, name: p.name ? `${p.name}#${p.tag}` : '', championId: p.champ, position: p.pos, items: p.items, spells: p.spells, keystone: p.keystone, level: p.level,
    scores: { kills: p.k, deaths: p.d, assists: p.a, creepScore: p.cs, wardScore: p.vision },
  }, { ally });
  return (
    <div className={`match-team ${ally ? 'ally' : 'enemy'}`}>
      <div className="team-head">
        <h3 className={ally ? 'ally-title' : 'enemy-title'}>{t(team && team.win ? 'history.win' : 'history.loss')} · {t(ally ? 'draft.allies' : 'draft.enemies')}</h3>
        <span className="muted small">{t('history.teamObjectives', { kills: team?.kills || 0, dragons: team?.dragons || 0, barons: team?.barons || 0, towers: team?.towers || 0 })}</span>
      </div>
      {players.map((p) => (
        <button key={p.pid} className={`mrow ${p.puuid === me.puuid ? 'me' : ''}`} onClick={() => open(p)}>
          <span className="role-badge">{p.pos ? <RoleIcon role={p.pos} /> : null}</span>
          <ChampIcon id={p.champ} size="xs" />
          <span className="mname"><strong>{data.champName(p.champ)}</strong><span className="muted">{p.name || ''}</span></span>
          <span className="live-kda">{kdaText(p.k, p.d, p.a)}</span>
          <span className="muted">{`${p.cs} CS`}</span>
          <span className="pgold"><span>{fmtGold(p.dmg)}</span><i style={{ width: `${(p.dmg / maxDmg) * 100}%`, background: ally ? COLORS.ally : COLORS.enemy }} /></span>
          <span className="gold-text">{fmtGold(p.gold)}</span>
          <span className="pitems">{p.items.map((id, i) => <ItemIcon key={`${id}-${i}`} id={id} size="xs" />)}</span>
        </button>
      ))}
    </div>
  );
}
