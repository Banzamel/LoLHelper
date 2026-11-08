// A match the app recorded: result, champion, opponent, score and items; opens the purchase
// timeline, the gold lead and the enemies' items.
import { useState } from 'react';
import type { HistoryEntry } from '../../../core/history/types.ts';
import { fmtDate, fmtGold, fmtMinutes, kdaText } from '../../../shared/lib/format.ts';
import { useT, useTranslator } from '../../../shared/i18n/useT.ts';
import { COLORS } from '../../../shared/ui/charts/chartLayout.ts';
import { LineChart } from '../../../shared/ui/charts/LineChart.tsx';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { ChampIcon, ItemIcon, useGameData } from '../../database/index.ts';

export function LearningRow({ game: g, onRemove }: { game: HistoryEntry; onRemove: () => void }) {
  const t = useT();
  const { locale } = useTranslator();
  const data = useGameData();
  const [open, setOpen] = useState(false);
  return (
    <div className={`hist-row ${g.win ? 'win' : 'loss'}`}>
      <div className="hist-main" onClick={() => setOpen(!open)}>
        <span className="hist-result">{t(g.win ? 'history.win' : 'history.loss')}</span>
        <ChampIcon id={g.championId} size="sm" />
        <div className="hist-name"><strong>{data.champName(g.championId)}</strong><span className="muted">{`${fmtDate(Date.parse(g.date), locale)} · ${fmtMinutes(g.duration)}`}</span></div>
        <div className="role-badge">{g.role ? <RoleIcon role={g.role} /> : null}</div>
        {g.opponentId ? <div className="hist-vs"><span className="muted">vs</span><ChampIcon id={g.opponentId} size="xs" /></div> : <div />}
        <span className="live-kda">{kdaText(g.kda.kills, g.kda.deaths, g.kda.assists)}</span>
        <span className="muted">{`${g.cs} CS`}</span>
        <div className="build-strip">{g.items.map((id, i) => <ItemIcon key={`${id}-${i}`} id={id} size="sm" />)}</div>
        <button className="btn small ghost" title={t('history.remove')} onClick={(e) => { e.stopPropagation(); onRemove(); }}>×</button>
      </div>
      <div className="hist-details" hidden={!open}>
        <span className="muted">{t('history.timeline')}</span>
        <div className="hist-timeline">{g.purchases.map((p, i) => <div key={i} className="hist-buy"><ItemIcon id={p.id} size="sm" /><span className="muted">{fmtMinutes(p.t)}</span></div>)}</div>
        {open && g.gold && g.gold.length > 1 ? (
          <LineChart series={[{ label: t('live.goldLeadAxis'), color: COLORS.ally, points: g.gold.map(([m, a, e]) => [m, a - e]) }]}
            diverging={{ pos: COLORS.ally, neg: COLORS.enemy }} xFmt={(v) => `${v}'`} yFmt={(v) => `${v > 0 ? '+' : ''}${fmtGold(v)}`} height={150} />
        ) : null}
        <span className="muted">{t('history.enemies')}</span>
        <div className="hist-enemies">
          {g.enemies.map((e, i) => (
            <div key={i} className="hist-enemy"><ChampIcon id={e.championId} size="xs" />{e.position ? <RoleIcon role={e.position} /> : null}{e.items.map((id, j) => <ItemIcon key={j} id={id} size="xs" />)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
