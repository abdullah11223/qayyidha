import { ICONS } from '../icons.js';

const APP_VERSION = '1.0';

export function renderMore(el) {
  el.innerHTML = `
    <div class="topbar"><div class="title">المزيد</div></div>
    <div class="card" style="display:flex; align-items:center; gap:12px;">
      <div style="color:var(--gold); width:36px; height:36px;">${ICONS.crown}</div>
      <div>
        <div style="font-weight:800;">قيّدها</div>
        <div class="hint">الإصدار ${APP_VERSION} — نسخة الويب</div>
      </div>
    </div>
  `;
}
