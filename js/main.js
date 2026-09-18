import { DB } from './db.js';
import { ICONS } from './icons.js';
import { renderHome } from './views/home.js';
import { renderMatches } from './views/matches.js';
import { renderStats } from './views/stats.js';
import { renderMore } from './views/more.js';
import { renderNewSession } from './views/newSession.js';
import { renderScoring } from './views/scoring.js';
import { renderPlayerDetail } from './views/playerDetail.js';
import { renderPlayers } from './views/players.js';

const screens = {
  home: document.getElementById('screen-home'),
  matches: document.getElementById('screen-matches'),
  stats: document.getElementById('screen-stats'),
  more: document.getElementById('screen-more'),
  'new-session': document.getElementById('screen-new-session'),
  scoring: document.getElementById('screen-scoring'),
  'player-detail': document.getElementById('screen-player-detail'),
  players: document.getElementById('screen-players'),
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

function setTabbarVisible(visible) {
  document.getElementById('tabbar').style.display = visible ? 'flex' : 'none';
  document.getElementById('app').classList.toggle('no-tabbar', !visible);
}

export const Nav = {
  showTab(tab) {
    pushedScreen = null;
    activeTab = tab;
    setTabbarVisible(true);
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
    setTabbarVisible(false);
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
  openPlayers() {
    Nav.push('players', (el, nav) => renderPlayers(el, nav));
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

// تثبيت التطبيق (Add to Home Screen) — يُطلب يدويًا فقط من تبويب "المزيد"
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

Nav.promptInstall = async function () {
  if (isStandalone()) {
    Nav.showConfirm({
      title: 'التطبيق مثبت بالفعل',
      message: 'قيّدها مثبت على جهازك ويعمل كتطبيق مستقل من الشاشة الرئيسية.',
      actions: [{ label: 'تم' }],
    });
    return;
  }
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return;
  }
  if (isIOS()) {
    Nav.showConfirm({
      title: 'إضافة إلى الشاشة الرئيسية',
      message: 'اضغط على زر المشاركة ⬆️ بالأسفل من سفاري، ثم اختر "إضافة إلى الشاشة الرئيسية".',
      actions: [{ label: 'تم' }],
    });
    return;
  }
  Nav.showConfirm({
    title: 'التثبيت غير متاح الآن',
    message: 'افتح هذا الرابط من متصفح Chrome على جوالك لتتمكن من إضافته للشاشة الرئيسية.',
    actions: [{ label: 'تم' }],
  });
};
