import { DB } from './db.js';
import { ICONS } from './icons.js';
import { renderHome } from './views/home.js';
import { renderMatches } from './views/matches.js';
import { renderStats } from './views/stats.js';
import { renderMore } from './views/more.js';
import { renderNewSession } from './views/newSession.js';
import { renderScoring } from './views/scoring.js';
import { renderPlayerDetail } from './views/playerDetail.js';

const screens = {
  home: document.getElementById('screen-home'),
  matches: document.getElementById('screen-matches'),
  stats: document.getElementById('screen-stats'),
  more: document.getElementById('screen-more'),
  'new-session': document.getElementById('screen-new-session'),
  scoring: document.getElementById('screen-scoring'),
  'player-detail': document.getElementById('screen-player-detail'),
};

const TAB_SCREENS = ['home', 'matches', 'stats', 'more'];
let activeTab = 'home';
let pushedScreen = null;

function setActive(id) {
  Object.values(screens).forEach((el) => el.classList.remove('active'));
  screens[id].classList.add('active');
}

function renderTabBar() {
  const bar = document.getElementById('tabbar');
  const items = [
    { id: 'home', label: 'الرئيسية', icon: ICONS.house },
    { id: 'matches', label: 'المباريات', icon: ICONS.list },
    { id: 'stats', label: 'الإحصائيات', icon: ICONS.chart },
    { id: 'more', label: 'المزيد', icon: ICONS.more },
  ];
  bar.innerHTML = items
    .map(
      (it) => `<button data-tab="${it.id}" class="${activeTab === it.id && !pushedScreen ? 'active' : ''}">
        ${it.icon}<span>${it.label}</span>
      </button>`
    )
    .join('');
  bar.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => Nav.showTab(btn.dataset.tab));
  });
}

export const Nav = {
  showTab(tab) {
    pushedScreen = null;
    activeTab = tab;
    document.getElementById('tabbar').style.display = 'flex';
    setActive(tab);
    Nav.refreshTab(tab);
    renderTabBar();
  },
  refreshTab(tab) {
    const t = tab || activeTab;
    if (t === 'home') renderHome(screens.home, Nav);
    if (t === 'matches') renderMatches(screens.matches, Nav);
    if (t === 'stats') renderStats(screens.stats, Nav);
    if (t === 'more') renderMore(screens.more, Nav);
  },
  push(screenId, renderFn) {
    pushedScreen = screenId;
    document.getElementById('tabbar').style.display = 'none';
    setActive(screenId);
    renderFn(screens[screenId], Nav);
  },
  back() {
    if (pushedScreen) {
      pushedScreen = null;
    }
    Nav.showTab(activeTab);
  },
  openNewSession(preselectedGameType) {
    Nav.push('new-session', (el, nav) => renderNewSession(el, nav, preselectedGameType));
  },
  openScoring(sessionId) {
    Nav.push('scoring', (el, nav) => renderScoring(el, nav, sessionId));
  },
  openPlayerDetail(playerId) {
    Nav.push('player-detail', (el, nav) => renderPlayerDetail(el, nav, playerId));
  },
  showSheet(renderFn) {
    const backdrop = document.getElementById('sheet-backdrop');
    const content = document.getElementById('sheet-content');
    renderFn(content, Nav);
    backdrop.classList.add('active');
  },
  hideSheet() {
    document.getElementById('sheet-backdrop').classList.remove('active');
  },
  showConfirm({ title, message, actions }) {
    const backdrop = document.getElementById('confirm-backdrop');
    const content = document.getElementById('confirm-content');
    content.innerHTML = `
      <div class="ct">${title}</div>
      <div class="cm">${message}</div>
      <div class="actions" id="confirm-actions"></div>
    `;
    const actionsEl = content.querySelector('#confirm-actions');
    actions.forEach((a) => {
      const btn = document.createElement('button');
      btn.className = a.danger ? 'btn-primary btn-danger' : 'btn-secondary';
      btn.textContent = a.label;
      btn.addEventListener('click', () => {
        backdrop.classList.remove('active');
        a.onTap && a.onTap();
      });
      actionsEl.appendChild(btn);
    });
    backdrop.classList.add('active');
  },
};

document.getElementById('sheet-backdrop').addEventListener('click', (e) => {
  if (e.target.id === 'sheet-backdrop') Nav.hideSheet();
});

// بدء التطبيق على الشاشة الرئيسية
Nav.showTab('home');

// بانر تشجيع التثبيت (Add to Home Screen)
const INSTALL_HINT_KEY = 'qayyidha_install_hint_dismissed';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

let deferredInstallPrompt = null;

function showInstallBanner(kind) {
  if (localStorage.getItem(INSTALL_HINT_KEY)) return;
  const banner = document.getElementById('install-banner');
  banner.innerHTML =
    kind === 'ios'
      ? `<span class="msg">ثبّت قيّدها على شاشتك الرئيسية: اضغط <b>مشاركة</b> ⬆️ ثم <b>إضافة إلى الشاشة الرئيسية</b></span>
         <button id="install-dismiss">✕</button>`
      : `<span class="msg">ثبّت قيّدها كتطبيق على جهازك لتجربة أسرع وبدون إنترنت</span>
         <button id="install-action">تثبيت</button>
         <button id="install-dismiss">✕</button>`;

  document.getElementById('install-dismiss').addEventListener('click', () => {
    banner.classList.remove('show');
    localStorage.setItem(INSTALL_HINT_KEY, '1');
  });
  const actionBtn = document.getElementById('install-action');
  if (actionBtn) {
    actionBtn.addEventListener('click', async () => {
      banner.classList.remove('show');
      localStorage.setItem(INSTALL_HINT_KEY, '1');
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
      }
    });
  }
  requestAnimationFrame(() => banner.classList.add('show'));
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showInstallBanner('android');
});

if (!isStandalone() && isIOS()) {
  setTimeout(() => showInstallBanner('ios'), 1800);
}
