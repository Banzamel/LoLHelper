// The running match: polling, recording and the simulated match (LiveGameService), the Match
// view, and the in-game build helpers the widget shares.
export { LiveGameService, type DevSwitches } from './LiveGameService.ts';
export { LiveView } from './views/LiveView.tsx';
export { bought, buildForGame, buildInputs, isPlaying, needsStarters, nextSkill, startersCost, type GameBuild } from './gameModel.ts';
