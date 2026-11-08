// The champion page header: splash art, name, tags, positions and the way to its build.
import { useT } from '../../../shared/i18n/useT.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import type { UiChampion } from '../types.ts';
import { ChampIcon } from './ChampIcon.tsx';

interface Props { champion: UiChampion; onBack: () => void; onBuild: () => void }

export function ChampionHero({ champion: c, onBack, onBuild }: Props) {
  const t = useT();
  const splash = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${c.id}_0.jpg`;
  return (
    <div className="hero">
      <div className="hero-bg" style={{ backgroundImage: `url('${splash}')` }} />
      <div className="hero-content">
        <button className="btn small ghost" onClick={onBack}>{`‹ ${t('champion.back')}`}</button>
        <div className="hero-main">
          <ChampIcon id={c.id} size="lg" />
          <div>
            <h1>{c.name}</h1>
            <div className="hero-title">{c.title}</div>
            <div className="chips">
              {c.tags.map((g) => <span key={g} className="chip">{t(`tag.${g}`)}</span>)}
              <span className={`chip ${c.damageType === 'AP' ? 'ap' : 'ad'}`}>{c.damageType}</span>
              <span className="chip">{t(`attack.${c.attackType}`)}</span>
              {c.positions.map((p) => <span key={p} className="chip teal"><RoleIcon role={p} />{t(`role.${p}`)}</span>)}
            </div>
          </div>
          <div className="spacer" />
          <button className="btn primary" onClick={onBuild}>{t('champion.showBuild')}</button>
        </div>
        <p className="hero-blurb">{c.blurb}</p>
      </div>
    </div>
  );
}
