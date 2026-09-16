import { DB } from '../db.js';
import { GameTypes } from '../engines.js';
import { ICONS } from '../icons.js';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}

function sessionRow(session, participants) {
  const gt = GameTypes[session.gameType];
  const names = participants.map((p) => p.name).join(' · ');
  return `
    <div class="history-row" data-session="${session.id}" style="margin-bottom:10px;">
      <div class="icon-badge">${ICONS[gt.symbol]}</div>
      <div class="texts">
        <div class="t1">${gt.displayName}</div>
        <div class="t2">${names}</div>
      </div>
      <div style="text-align:left;">
        <div class="t2">${formatDate(session.updatedAt)}</div>
        ${session.isFinished ? '<div class="t2" style="color:var(--win-green);">انتهت ✓</div>' : ''}
      </div>
      <button class="icon-btn del-session" data-session-del="${session.id}" style="color:var(--loss-red);">✕</button>
    </div>
  `;
}

export function renderMatches(el, Nav) {
  const sessions = DB.allSessions();
  const active = sessions.filter((s) => !s.isFinished);
  const finished = sessions.filter((s) => s.isFinished);

  let html = `<div class="topbar"><div class="title">قيّدها</div>
    <button class="icon-btn" id="add-session">＋</button></div>`;

  if (sessions.length === 0) {
    html += `<div class="empty-state">
      <div class="icon">🎮</div>
      <div class="t">لا توجد جلسات بعد</div>
      <div>ابدأ جلسة جديدة لتسجيل نقاط أول لعبة</div>
    </div>`;
  } else {
    if (active.length) {
      html += `<div class="section-header">قيد اللعب</div>`;
      html += active.map((s) => sessionRow(s, DB.participantsForSession(s.id))).join('');
    }
    if (finished.length) {
      html += `<div class="section-header">جلسات منتهية</div>`;
      html += finished.map((s) => sessionRow(s, DB.participantsForSession(s.id))).join('');
    }
  }

  el.innerHTML = html;

  el.querySelector('#add-session').addEventListener('click', () => Nav.openNewSession(null));
  el.querySelectorAll('[data-session]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-session-del]')) return;
      Nav.openScoring(row.dataset.session);
    });
  });
  el.querySelectorAll('[data-session-del]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      Nav.showConfirm({
        title: 'حذف الجلسة؟',
        message: 'سيُحذف كل شيء متعلّق بهذه الجلسة نهائيًا.',
        actions: [
          { label: 'حذف', danger: true, onTap: () => { DB.deleteSession(btn.dataset.sessionDel); renderMatches(el, Nav); } },
          { label: 'إلغاء' },
        ],
      });
    });
  });
}
