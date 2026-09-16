import { GameTypes } from '../engines.js';
import { ICONS } from '../icons.js';

export function renderHome(el, Nav) {
  el.innerHTML = `
    <div class="title-row">${ICONS.crown} قيّدها</div>
    <div class="subtitle">اختر اللعبة التي تريد حسابها</div>

    <div class="game-cards">
      <div class="game-card bint" data-game="bintAlSebha">
        ${ICONS.people}
        <div class="name">بنت السبيت</div>
        <div class="sub">حاسبة نقاط</div>
        <button class="start-btn" data-game="bintAlSebha">ابدأ</button>
      </div>
      <div class="game-card baloot" data-game="baloot">
        ${ICONS.club}
        <div class="name">البلوت</div>
        <div class="sub">حاسبة نقاط</div>
        <button class="start-btn" data-game="baloot">ابدأ</button>
      </div>
    </div>

    <div class="history-row" id="history-row">
      <div class="icon-badge">${ICONS.calendar}</div>
      <div class="texts">
        <div class="t1">تاريخ المباريات</div>
        <div class="t2">عرض جميع مبارياتك السابقة</div>
      </div>
      <div class="chevron">${ICONS.chevronLeft}</div>
    </div>
  `;

  el.querySelectorAll('[data-game]').forEach((node) => {
    node.addEventListener('click', () => Nav.openNewSession(node.dataset.game));
  });
  el.querySelector('#history-row').addEventListener('click', () => Nav.showTab('matches'));
}
