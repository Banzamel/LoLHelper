// Champion detail: profile, stats by level, abilities, tips and matchups.
import { useService } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { Navigator } from '../../../shared/lib/Navigator.ts';
import { BuildService } from '../../builds/index.ts';
import { Ability } from '../components/Ability.tsx';
import { ChampionHero } from '../components/ChampionHero.tsx';
import { ChampionStats } from '../components/ChampionStats.tsx';
import { MatchupList } from '../components/MatchupList.tsx';
import { useGameData } from '../hooks/useGameData.ts';

const TRAITS = ['hardCC', 'slow', 'dash', 'heal', 'shield', 'stealth', 'untargetable', 'percentHp', 'trueDamage', 'execute', 'longRange'];

function Tips({ title, list }: { title: string; list: string[] }) {
  if (!list || !list.length) return null;
  return <div><h3 className="sub">{title}</h3><ul className="tips">{list.map((x, i) => <li key={i}>{x}</li>)}</ul></div>;
}

export function ChampionView({ id }: { id: string }) {
  const t = useT();
  const data = useGameData();
  const nav = useService(Navigator);
  const builds = useService(BuildService);
  const c = data.champ(id);
  if (!c) return null;
  const matchups = builds.matchups(c.id);
  const openBuild = () => { builds.setTarget({ championId: c.id, enemyId: null, role: c.positions[0] }); nav.navigate('build'); };
  return (
    <>
      <ChampionHero champion={c} onBack={() => nav.navigate('champions')} onBuild={openBuild} />
      <div className="champ-layout">
        <div className="champ-col">
          <ChampionStats stats={c.stats} />
          <section className="panel">
            <h2>{t('champion.ratings')}</h2>
            <div className="ratings">
              {Object.entries(c.ratings).map(([k, v]) => (
                <div className="rating" key={k}><span className="muted">{t(`rating.${k}`)}</span><div className="bar gold"><i style={{ width: `${(v / 3) * 100}%` }} /></div></div>
              ))}
            </div>
            <h3 className="sub">{t('champion.traits')}</h3>
            <div className="chips">
              {TRAITS.filter((k) => c.traits[k] > 0).map((k) => <span key={k} className="chip">{`${t(`trait.${k}`)}${c.traits[k] > 1 ? ` ×${c.traits[k]}` : ''}`}</span>)}
            </div>
          </section>
          <section className="panel">
            <MatchupList title={t('champion.strongAgainst')} ids={matchups.strong} />
            <MatchupList title={t('champion.weakAgainst')} ids={matchups.weak} />
          </section>
        </div>
        <div className="champ-col wide">
          <section className="panel">
            <h2>{t('champion.abilities')}</h2>
            <div className="abilities">
              <Ability hotkey="P" ability={c.passive} />
              {c.spells.map((s) => <Ability key={s.key} hotkey={s.key} ability={s} />)}
            </div>
          </section>
          <section className="panel"><Tips title={t('champion.allyTips')} list={c.allytips} /><Tips title={t('champion.enemyTips')} list={c.enemytips} /></section>
        </div>
      </div>
    </>
  );
}
