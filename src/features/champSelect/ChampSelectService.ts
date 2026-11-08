// The draft set by hand (no client, or to plan ahead) and the player's chosen role, which is
// also their position in modes without assigned roles.
import type { Role } from '../../core/data/types.ts';
import { Store } from '../../shared/lib/Store.ts';
import type { ClientService } from '../client/index.ts';

export interface ManualDraft {
  myTeam: (string | null)[];
  theirTeam: (string | null)[];
  myRole: Role;
  // The enemy the player marked as lane opponent.
  opponent: string | null;
}

const empty = () => Array<string | null>(5).fill(null);

export class ChampSelectService {
  readonly store = new Store<ManualDraft>({ myTeam: empty(), theirTeam: empty(), myRole: 'MIDDLE', opponent: null });

  constructor(private readonly client: ClientService) {}

  init() { this.client.setMyRole(this.store.get().myRole); }

  setRole(role: Role) {
    this.store.set({ myRole: role, opponent: null });
    this.client.setMyRole(role);
  }

  setAlly(i: number, id: string | null) {
    this.store.set((s) => ({ myTeam: s.myTeam.map((x, j) => (j === i ? id : x)) }));
  }

  setEnemy(i: number, id: string | null) {
    this.store.set((s) => ({ theirTeam: s.theirTeam.map((x, j) => (j === i ? id : x)), opponent: id ? null : s.opponent }));
  }

  setOpponent(id: string | null) { this.store.set({ opponent: id }); }

  reset() { this.store.set({ myTeam: empty(), theirTeam: empty(), opponent: null }); }
}
