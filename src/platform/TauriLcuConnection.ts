// The League client connection held in Rust (lockfile, HTTPS, WebSocket with Riot's
// self-signed certificate), as the LcuConnection the core watcher expects.
import type { LcuConnection, LcuEvent, LcuStatus } from '../core/lcu/types.ts';
import { commands } from './commands.ts';
import { nativeEvents } from './events.ts';

export class TauriLcuConnection implements LcuConnection {
  private statusListeners: ((s: LcuStatus) => void)[] = [];
  private eventListeners: ((e: LcuEvent) => void)[] = [];

  constructor() {
    void nativeEvents.lcuStatus((s) => this.statusListeners.forEach((fn) => fn(s)));
    void nativeEvents.lcuEvent((e) => this.eventListeners.forEach((fn) => fn(e)));
  }

  // The status may have changed before the listeners were registered; it is reported once more.
  start(leagueDir: string) {
    void commands.lcuStart(leagueDir).then(() => commands.lcuStatus()).then((s) => {
      if (s.connected) this.statusListeners.forEach((fn) => fn(s));
    });
  }

  onStatus(fn: (status: LcuStatus) => void) { this.statusListeners.push(fn); }
  onEvent(fn: (event: LcuEvent) => void) { this.eventListeners.push(fn); }

  get(endpoint: string) { return commands.lcuRequest('GET', endpoint); }
  request(method: string, endpoint: string, body?: unknown) { return commands.lcuRequest(method, endpoint, body); }
}
