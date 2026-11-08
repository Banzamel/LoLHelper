// Champion picker in a modal: search and role tabs. useChampionPicker resolves with a champion
// id, '' when the slot was cleared, or null when dismissed.
import { useState } from 'react';
import { ROLES } from '../../../core/data/types.ts';
import { useService } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { RoleIcon } from '../../../shared/ui/icons.tsx';
import { ModalController } from '../../../shared/ui/overlays/ModalController.tsx';
import { useGameData } from '../hooks/useGameData.ts';
import { ChampIcon } from './ChampIcon.tsx';

interface PickOptions { role?: string | null; exclude?: (string | null)[]; allowClear?: boolean }

function ChampionPicker({ role, exclude, onDone }: PickOptions & { onDone: (id: string) => void }) {
  const t = useT();
  const data = useGameData();
  const [filterRole, setFilterRole] = useState<string | null>(role || null);
  const [query, setQuery] = useState('');
  const q = query.toLowerCase();
  const list = data.champions.filter((c) => !(exclude || []).includes(c.id) && (!filterRole || c.positions.includes(filterRole as never))
    && (!q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)));
  return (
    <div>
      <div className="picker-head">
        <input className="input search" placeholder={t('picker.search')} autoFocus value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="tabs">
          {[null, ...ROLES].map((r) => (
            <button key={r || 'any'} className={`tab ${filterRole === r ? 'active' : ''}`} title={t(r ? `role.${r}` : 'role.any')} onClick={() => setFilterRole(r)}>
              {r ? <RoleIcon role={r} /> : t('role.any')}
            </button>
          ))}
        </div>
      </div>
      <div className="picker-grid">
        {list.map((c) => <button key={c.id} className="picker-cell" onClick={() => onDone(c.id)}><ChampIcon id={c.id} /><span>{c.name}</span></button>)}
      </div>
    </div>
  );
}

export function useChampionPicker() {
  const modal = useService(ModalController);
  const t = useT();
  return ({ role = null, exclude = [], allowClear = true }: PickOptions = {}) => new Promise<string | null>((resolve) => {
    let result: string | null = null;
    const done = (id: string) => { result = id; modal.close(); };
    modal.open({
      title: t('picker.title'),
      body: <ChampionPicker role={role} exclude={exclude} onDone={done} />,
      actions: allowClear ? <button className="btn small ghost" onClick={() => done('')}>{t('picker.clear')}</button> : undefined,
      onClose: () => resolve(result),
    });
  });
}
