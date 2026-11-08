// Line icons of the sidebar and the position glyphs (lane highlighted on a 3-lane map square).
// The paths are constants of this file, never user data.
const NAV: Record<string, string> = {
  draft: '<path fill="none" stroke="currentColor" stroke-width="1.6" d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z"/>',
  live: '<path fill="none" stroke="currentColor" stroke-width="1.6" d="M4 20L14 10M14 10l2-6 4 4-6 2M6 14l4 4M3 21l2-2"/><circle cx="18" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  build: '<path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7z M9 12l2 2 4-4"/>',
  champions: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  history: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 7v5l3 2"/>',
  items: '<path fill="none" stroke="currentColor" stroke-width="1.6" d="M5 8h14l-1.5 12h-11zM9 8V6a3 3 0 016 0v2"/>',
  settings: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
};

const ROLE: Record<string, string> = {
  TOP: '<path fill="currentColor" d="M3 3h13l-4 4H7v5l-4 4z" opacity=".95"/><path fill="currentColor" opacity=".3" d="M21 21H8l4-4h5v-5l4-4z"/>',
  JUNGLE: '<path fill="currentColor" d="M12 2c-1 4-4 6-4 10 0 3 2 5 4 8 2-3 4-5 4-8 0-4-3-6-4-10zM5 7c0 4 1 7 4 9-1-3-1-6 0-8zM19 7c0 4-1 7-4 9 1-3 1-6 0-8z"/>',
  MIDDLE: '<path fill="currentColor" opacity=".3" d="M3 3h9l-9 9zM21 21h-9l9-9z"/><path fill="currentColor" d="M17 3h4v4L7 21H3v-4z"/>',
  BOTTOM: '<path fill="currentColor" d="M21 21H8l4-4h5v-5l4-4z" opacity=".95"/><path fill="currentColor" opacity=".3" d="M3 3h13l-4 4H7v5l-4 4z"/>',
  SUPPORT: '<path fill="currentColor" d="M9 4h6l-1 3h-4zM4 7h5l2 3-2 2-5-3zM20 7h-5l-2 3 2 2 5-3zM10 11h4l-1 9h-2z"/>',
};
const NO_ROLE = '<circle cx="12" cy="12" r="6" fill="currentColor" opacity=".4"/>';

const Svg = ({ paths }: { paths: string }) => <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: paths }} />;

export const NavIcon = ({ name }: { name: string }) => <Svg paths={NAV[name] || ''} />;
export const RoleIcon = ({ role }: { role: string | null | undefined }) => <Svg paths={(role && ROLE[role]) || NO_ROLE} />;
