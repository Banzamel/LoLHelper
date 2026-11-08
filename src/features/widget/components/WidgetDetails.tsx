// The widget's lower rows: what to buy right now, the buy order, the next skill and the lane
// opponent with their rank and items.
import type { PlayingGame } from '../../../core/live/types.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { RankBadge } from '../../../shared/ui/RankBadge.tsx';
import { ChampIcon, ItemIcon, useGameData } from '../../database/index.ts';
import { bought, needsStarters, nextSkill, type GameBuild } from '../../liveGame/index.ts';

export function WidgetDetails({ game, model }: { game: PlayingGame; model: GameBuild }) {
  const t = useT();
  const data = useGameData();
  const { build, opp, fullIds } = model;
  const owned = new Set(model.owned);
  const next = build.next;
  const buy = !needsStarters(data, game) && next && next.buy && next.buy.id !== next.id ? data.item(next.buy.id) : null;
  const skill = nextSkill(build, game.me.level);
  const champ = data.champ(game.me.championId);
  const spell = skill && champ ? (skill.key === 'R' ? champ.spells[3] : champ.spells.find((s) => s.key === skill.key)) : null;
  return (
    <>
      {buy && next && next.buy ? (
        <div className="w-buy"><span>{t('live.buyNow')}</span><ItemIcon id={buy.id} nameOnly /><strong>{buy.name}</strong><span className="gold-text">{String(next.buy.cost)}</span></div>
      ) : null}
      <div className="w-strip">{fullIds.map((id, i) => <div key={`${id}-${i}`} className={owned.has(id) ? 'owned' : ''}><ItemIcon id={id} nameOnly /></div>)}</div>
      {skill && champ ? (
        <div className="w-skill">
          <div className="skill-key">{spell ? <img src={data.asset(spell.icon)} alt={skill.key} /> : null}<span>{skill.key}</span></div>
          <span>{t('overlay.nextSkill', { level: skill.level })} <strong>{spell ? `${skill.key} — ${spell.name}` : skill.key}</strong></span>
        </div>
      ) : null}
      {opp ? (
        <div className="w-opp">
          <ChampIcon id={opp.championId} size="xs" />
          <span>{data.champName(opp.championId)}</span>
          <RankBadge rank={opp.rank} compact />
          {bought(data, opp.items).map((id, i) => <ItemIcon key={`${id}-${i}`} id={id} nameOnly />)}
        </div>
      ) : null}
    </>
  );
}
