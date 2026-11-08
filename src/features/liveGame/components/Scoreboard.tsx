// The scoreboard: kills, game time, item gold lead and both teams' objectives.
import type { Objectives, PlayingGame } from '../../../core/live/types.ts';
import { fmtGold, fmtMinutes } from '../../../shared/lib/format.ts';
import { useT } from '../../../shared/i18n/useT.ts';
import { COLORS } from '../../../shared/ui/charts/chartLayout.ts';
import { VersusBar } from '../../../shared/ui/charts/VersusBar.tsx';

const DRAGON_COLORS: Record<string, string> = { Fire: '#e8613a', Water: '#4aa3df', Earth: '#a5784b', Air: '#d7e3ea', Hextech: '#3fd0e0', Chemtech: '#7fd35b', Elder: '#b77ee8' };
const OPTIONAL: (keyof Objectives)[] = ['grubs', 'heralds', 'barons', 'atakhan', 'inhibs'];

function ObjectiveList({ o, side }: { o: Objectives; side: string }) {
  const t = useT();
  const chip = (key: keyof Objectives, n: number) => <span key={key} className="obj" title={t(`obj.${key}`)}><span className="obj-name">{t(`obj.${key}Short`)}</span><strong>{String(n)}</strong></span>;
  return (
    <div className={`sb-objectives ${side}`}>
      <span className="obj dragons" title={o.dragons.map((d) => t(`dragon.${d}`)).join(', ') || t('obj.dragons')}>
        <span className="obj-name">{t('obj.dragonsShort')}</span>
        {o.dragons.length ? o.dragons.map((d, i) => <i key={i} className="dragon-dot" style={{ background: DRAGON_COLORS[d] || COLORS.gold }} />) : <strong>0</strong>}
      </span>
      {chip('towers', o.towers)}
      {OPTIONAL.map((k) => (o[k] ? chip(k, o[k] as number) : null))}
    </div>
  );
}

export function Scoreboard({ game }: { game: PlayingGame }) {
  const t = useT();
  const { ally, enemy } = game.objectives;
  const allyGold = game.allies.reduce((s, p) => s + p.itemGold, 0);
  const enemyGold = game.enemies.reduce((s, p) => s + p.itemGold, 0);
  const diff = allyGold - enemyGold;
  return (
    <section className="scoreboard">
      <div className="sb-row">
        <div className="sb-side ally"><span className="sb-label">{t('draft.allies')}</span><strong className="sb-kills">{String(ally.kills)}</strong></div>
        <div className="sb-center">
          <span className="sb-time">{fmtMinutes(game.gameTime)}</span>
          <span className={`sb-diff ${diff > 0 ? 'plus' : diff < 0 ? 'minus' : ''}`} title={t('live.goldLeadHint')}>{`${diff > 0 ? '+' : ''}${fmtGold(diff)}`}</span>
          <span className="sb-caption">{t(diff >= 0 ? 'live.goldLead' : 'live.goldBehind')}</span>
        </div>
        <div className="sb-side enemy"><strong className="sb-kills">{String(enemy.kills)}</strong><span className="sb-label">{t('draft.enemies')}</span></div>
      </div>
      <VersusBar a={allyGold} b={enemyGold} fmt={fmtGold} labelA={t('live.itemGoldShort')} labelB={t('live.itemGoldShort')} />
      <div className="sb-row objectives"><ObjectiveList o={ally} side="ally" /><ObjectiveList o={enemy} side="enemy" /></div>
    </section>
  );
}
