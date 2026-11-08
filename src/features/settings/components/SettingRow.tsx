import type { ReactNode } from 'react';

// One labelled setting with an optional hint under the label.
export function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="setting"><div><div>{label}</div>{hint ? <div className="muted small">{hint}</div> : null}</div>{children}</label>;
}
