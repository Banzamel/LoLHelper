// The in-game widget's behaviour, run in the main window: shown only while a match runs (or in
// preview / move mode), hidden and moved with global hotkeys, placed where the player left it.
// The widget window itself only renders what it is sent (WidgetApp).
import { nativeEvents, registerHotkeys, widgetWindow, windowMessages } from '../../platform/index.ts';
import { Store } from '../../shared/lib/Store.ts';
import type { BuildService } from '../builds/index.ts';
import type { DatabaseService } from '../database/index.ts';
import { buildForGame, isPlaying, type GameBuild, type LiveGameService } from '../liveGame/index.ts';
import type { SettingsService } from '../settings/index.ts';
import { WIDGET_READY, WIDGET_UPDATE, type WidgetState, type WidgetUpdate } from './types.ts';
import { widgetKey } from './widgetKey.ts';

const SAVE_DELAY_MS = 400;

export class OverlayService {
  readonly store = new Store<WidgetState>({ gameActive: false, moveMode: false, preview: false, userHidden: false, opacity: 0.92 });
  private model: GameBuild | null = null;
  private modelKey = '';
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly settings: SettingsService,
    private readonly live: LiveGameService,
    private readonly builds: BuildService,
    private readonly database: DatabaseService,
  ) {}

  async init() {
    const { bounds } = this.settings.value.overlay;
    if (bounds) await widgetWindow.place(bounds.x, bounds.y);
    await this.registerShortcuts();
    this.live.store.subscribe(() => { void this.onGame(); });
    void nativeEvents.overlayMoved((pos) => this.rememberBounds(pos));
    void windowMessages.listen(WIDGET_READY, () => { void this.push(); });
    this.update();
  }

  private registerShortcuts(): Promise<string[]> {
    const { toggleKey, moveKey } = this.settings.value.overlay;
    return registerHotkeys([[toggleKey, () => this.toggleVisible()], [moveKey, () => this.toggleMove()]]);
  }

  private rememberBounds(pos: { x: number; y: number }) {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.settings.set({ overlay: { ...this.settings.value.overlay, bounds: { x: Math.round(pos.x), y: Math.round(pos.y) } } });
    }, SAVE_DELAY_MS);
  }

  // A simulated match is never shown over the desktop.
  private async onGame() {
    const { game } = this.live.store.get();
    const active = isPlaying(game) && !game.demo;
    if (active !== this.store.get().gameActive) {
      this.store.set({ gameActive: active, ...(active ? {} : { userHidden: false }) });
      this.update();
    }
    await this.push();
  }

  private update() {
    const { enabled, opacity } = this.settings.value.overlay;
    const s = this.store.get();
    const visible = enabled && !s.userHidden && (s.gameActive || s.moveMode || s.preview);
    this.store.set({ opacity });
    void widgetWindow.apply(visible, s.moveMode);
    void this.push();
  }

  // Sends the widget what it shows; the build is recomputed only when it can change.
  private async push() {
    const { game } = this.live.store.get();
    const playing = isPlaying(game) && !game.demo ? game : null;
    const data = this.database.data;
    if (playing && data) {
      const key = widgetKey(playing);
      if (key !== this.modelKey || !this.model) {
        this.modelKey = key;
        this.model = await buildForGame(this.builds, data, playing);
      }
    } else {
      this.model = null;
      this.modelKey = '';
    }
    const { language, overlay } = this.settings.value;
    const update: WidgetUpdate = { state: this.store.get(), language, overlay, game: playing, model: this.model };
    await windowMessages.send('overlay', WIDGET_UPDATE, update).catch(() => {});
  }

  toggleVisible() {
    this.store.set({ userHidden: !this.store.get().userHidden });
    this.update();
  }

  toggleMove() {
    const moveMode = !this.store.get().moveMode;
    this.store.set({ moveMode, ...(moveMode ? { userHidden: false } : {}) });
    this.update();
  }

  setPreview(on: boolean) {
    this.store.set({ preview: on, moveMode: on });
    this.update();
  }

  // After a settings change: hotkeys again, visibility and a fresh widget (language).
  async applySettings(): Promise<string[]> {
    const failed = await this.registerShortcuts();
    this.update();
    await widgetWindow.reload();
    return failed;
  }

  reload() { void widgetWindow.reload(); }
}
