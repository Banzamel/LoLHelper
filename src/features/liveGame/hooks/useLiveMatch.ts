// The match shown by the Match view. A poll that changes nothing visible keeps the shown
// snapshot (so hovering a chart is not interrupted), and the build is recomputed only when
// items, gold (by 100), levels or scores change.
import { useEffect, useRef, useState } from 'react';
import type { RuneGuide } from '../../../core/engine/runes.ts';
import type { LiveGame, PlayingGame } from '../../../core/live/types.ts';
import { useService } from '../../../shared/hooks/services.tsx';
import { BuildService } from '../../builds/index.ts';
import { useGameData } from '../../database/index.ts';
import { buildForGame, buildInputs, isPlaying, type GameBuild } from '../gameModel.ts';

export type LiveData = GameBuild & { guide: RuneGuide };

function viewKey(g: PlayingGame, charts: boolean) {
  return JSON.stringify([g.me.items, g.me.level, g.me.gold, g.me.abilities, [...g.enemies, ...g.allies].map((e) => [e.items, e.level, e.scores, e.dead, e.respawn, e.position, e.rank]),
    // The charts redraw less often, so hovering them is not interrupted every poll.
    g.objectives, (g.timeline || []).length, Math.floor(g.gameTime / (charts ? 20 : 1))]);
}

const buildKey = (g: PlayingGame) => JSON.stringify([g.me.items, g.me.level, Math.floor(g.me.gold / 100), buildInputs(g)]);

export function useLiveMatch(game: LiveGame | null, charts: boolean): { game: PlayingGame; data: LiveData } | null {
  const builds = useService(BuildService);
  const data = useGameData();
  const [shown, setShown] = useState<{ game: PlayingGame; data: LiveData } | null>(null);
  const keys = useRef({ view: '', build: '' });
  useEffect(() => {
    if (!isPlaying(game)) { keys.current = { view: '', build: '' }; setShown(null); return; }
    const view = viewKey(game, charts);
    if (view === keys.current.view) return;
    keys.current.view = view;
    const bk = buildKey(game);
    if (bk === keys.current.build && shown) { setShown({ game, data: shown.data }); return; }
    keys.current.build = bk;
    let current = true;
    void buildForGame(builds, data, game).then((model) => {
      const guide = builds.runes({
        keystones: model.build.runes ? [model.build.runes.selectedPerkIds[0]] : [],
        enemies: game.enemies.map((e) => ({ championId: e.championId, role: e.position, keystone: e.keystone })),
      });
      if (current) setShown({ game, data: { ...model, guide } });
    });
    return () => { current = false; };
    // `shown` is read to reuse the last build; it must not retrigger the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, charts, builds, data]);
  return shown;
}
