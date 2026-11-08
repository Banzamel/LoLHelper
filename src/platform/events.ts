// Tauri events: from Rust to the windows, and between the main window and the widget.
import { emitTo, listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { LcuEvent, LcuStatus } from '../core/lcu/types.ts';

export type Unlisten = UnlistenFn;

const on = <T>(name: string, fn: (payload: T) => void): Promise<Unlisten> => listen<T>(name, (e) => fn(e.payload));

export const nativeEvents = {
  lcuStatus: (fn: (s: LcuStatus) => void) => on<LcuStatus>('lcu://status', fn),
  lcuEvent: (fn: (e: LcuEvent) => void) => on<LcuEvent>('lcu://event', fn),
  downloadTick: (fn: (t: { done: number; total: number }) => void) => on('db://download', fn),
  overlayMoved: (fn: (p: { x: number; y: number }) => void) => on('overlay://moved', fn),
  overlayCursor: (fn: (c: { inside: boolean; x: number; y: number }) => void) => on('overlay://cursor', fn),
};

// Messages between the two webviews; `window` is the label of the receiving window.
export const windowMessages = {
  send: <T>(window: 'main' | 'overlay', name: string, payload: T) => emitTo(window, name, payload),
  listen: <T>(name: string, fn: (payload: T) => void) => on<T>(name, fn),
};
