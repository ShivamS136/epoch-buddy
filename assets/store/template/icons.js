/* Bullet icon set for the store-image base template.
   Each value is the inner markup of a 24x24 line icon (Lucide-style strokes).
   `hydrate.js` wraps it in <svg viewBox="0 0 24 24"> and `theme.css` strokes it
   with currentColor. Add a new icon here, then reference it by key from a
   bullet's `icon` field in slides.config.mjs. */
window.ICONS = {
  cursor: '<path d="M5 3.5l6 15 2.2-5.6 5.6-2.2z"/>',
  window: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3 9.5h18"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10.5" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 3v4M16 3v4"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V5.5A2.5 2.5 0 0 1 7.5 3H16"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  bolt: '<path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13z"/>',
  code: '<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>',
  swap: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
  sliders: '<path d="M5 21V13M5 9V3M12 21v-6M12 11V3M19 21v-9M19 8V3"/><path d="M2.5 13h5M9.5 11h5M16.5 12h5"/>',
  check: '<path d="M20 6.5L9.2 17.5 4 12.3"/>',
  moon: '<path d="M20.5 13.5A8 8 0 1 1 10.5 3.5a6.3 6.3 0 0 0 10 10z"/>',
  shield: '<path d="M12 3l7.5 2.7v5.6c0 4.6-3.2 7.4-7.5 8.4-4.3-1-7.5-3.8-7.5-8.4V5.7z"/>',
  clipboardClock: '<path d="M16 14v2.2l1.6 1"/><path d="M16 4h2a2 2 0 0 1 2 2v.832"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2"/><circle cx="16" cy="16" r="6"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  coins:'<path d="M13.744 17.736a6 6 0 1 1-7.48-7.48"/><path d="M15 6h1v4"/><path d="m6.134 14.768.866-.5 2 3.464"/><circle cx="16" cy="8" r="6"/>'
};
