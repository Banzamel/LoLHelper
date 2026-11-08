// Export actions with their feedback: a toast on success or failure, and a confirmation before
// a rune page overwrites the selected one when the account has no free page.
import type { Build } from '../../../core/engine/types.ts';
import { errorMessage } from '../../../platform/index.ts';
import { useService } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { ModalController } from '../../../shared/ui/overlays/ModalController.tsx';
import { ToastController } from '../../../shared/ui/overlays/ToastController.ts';
import { useGameData } from '../../database/index.ts';
import { ExportService } from '../ExportService.ts';

export function useExports() {
  const t = useT();
  const data = useGameData();
  const exports = useService(ExportService);
  const toast = useService(ToastController);
  const modal = useService(ModalController);
  const fail = (key: string, e: unknown) => toast.show(t(key, { error: errorMessage(e) }), { error: true });

  return {
    async itemSet(build: Build) {
      const c = data.champ(build.championId);
      const e = data.champ(build.enemyId);
      if (!c) return;
      const title = e ? t('build.setTitle', { champ: c.id, enemy: e.id }) : t('build.setTitleBlind', { champ: c.id });
      const blockNames = { start: t('build.start'), boots: t('build.boots'), core: t('build.core'), situational: t('build.situational'), full: t('build.full') };
      try {
        await exports.itemSet(build, title, blockNames);
        toast.show(t('build.exported'));
      } catch (err) { fail('build.exportFailed', err); }
    },

    async runes(build: Build) {
      if (!build.runes) return;
      const name = data.champName(build.championId);
      try {
        let res = await exports.runePage(build.runes, name);
        if (res.status === 'noSlot') {
          if (!(await modal.confirm(t('loadout.noSlotTitle'), t('loadout.noSlot'), t('loadout.overwrite')))) return;
          res = await exports.runePage(build.runes, name, true);
        }
        toast.show(t('loadout.runesExported'));
      } catch (err) { fail('loadout.exportFailed', err); }
    },

    async spells(build: Build) {
      try {
        await exports.spells(build.spells.ids);
        toast.show(t('loadout.spellsExported'));
      } catch (err) { fail('loadout.exportFailed', err); }
    },
  };
}
