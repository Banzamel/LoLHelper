// Opens the player sheet in the modal.
import { useService } from '../../../shared/hooks/services.tsx';
import { useT } from '../../../shared/i18n/useT.ts';
import { ModalController } from '../../../shared/ui/overlays/ModalController.tsx';
import { PlayerSheet, type SheetPlayer } from '../components/PlayerSheet.tsx';

export function usePlayerSheet() {
  const modal = useService(ModalController);
  const t = useT();
  return (player: SheetPlayer, { ally = null }: { ally?: boolean | null } = {}) => {
    modal.open({ title: t('player.title'), body: <PlayerSheet player={player} ally={ally} /> });
  };
}
